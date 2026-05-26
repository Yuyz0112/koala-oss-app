/**
 * Collect news helper: screenshot capture, S3 upload, and Supabase insert.
 *
 * Usage:
 *   deno run -A collect-news.ts '<json>'
 *
 * Input JSON:
 *   { "url": "...", "title": "...", "content": "...", "tags": ["TAG1"] }
 *
 * Reads env vars from mcp-servers/.env automatically.
 * Outputs the inserted record as JSON on success.
 */
import "jsr:@std/dotenv@0.225.3/load";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.787.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// --- env vars ---
const S3_ACCOUNT_ID = Deno.env.get("S3_ACCOUNT_ID")!;
const S3_ACCESS_KEY_ID = Deno.env.get("S3_ACCESS_KEY_ID")!;
const S3_SECRET_ACCESS_KEY = Deno.env.get("S3_SECRET_ACCESS_KEY")!;
const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY")!;

for (const [k, v] of Object.entries({
  S3_ACCOUNT_ID, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
  CF_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY,
})) {
  if (!v) { console.error(`Missing env: ${k}`); Deno.exit(1); }
}

// --- clients ---
const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- helpers ---
function urlToImageName(url: string): string {
  const urlObj = new URL(url);
  let name = urlObj.hostname.replace(/^www\./, "");
  if (urlObj.pathname && urlObj.pathname !== "/") {
    const pathPart = urlObj.pathname.replace(/^\//, "").replace(/\//g, "-");
    name += "-" + pathPart;
  }
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") + ".png";
}

async function captureAndUploadScreenshot(url: string): Promise<string | null> {
  try {
    const imageName = urlToImageName(url);

    const addStyleTag = url.startsWith("https://github.com")
      ? [{
          content: `.header-wrapper,
            #repository-container-header,
            react-partial[partial-name="repos-overview"] div[data-target="react-partial.reactRoot"] div.Box-sc-g0xbh4-0.iNSVHo,
            table[aria-labelledby="folders-and-files"] { display: none; }
            .repository-content .container-xl { padding-left: 0 !important; padding-right: 0 !important; }
            .Box-sc-g0xbh4-0.iVEunk { margin-top: 0; }
            .vIPPs { gap: 0; }`,
        }]
      : [];

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${S3_ACCOUNT_ID}/browser-rendering/snapshot`,
      {
        method: "post",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CF_API_TOKEN}`,
        },
        body: JSON.stringify({
          url,
          screenshotOptions: { fullPage: false },
          viewport: { width: 600, height: 600, deviceScaleFactor: 2, isMobile: true },
          addStyleTag,
          gotoOptions: { waitUntil: "networkidle0", timeout: 20_000 },
        }),
      }
    );

    const body = await res.json();
    if (!body.success) {
      console.error(`Screenshot failed: ${JSON.stringify(body)}`);
      return null;
    }

    const binary = atob(body.result.screenshot);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    await S3.send(
      new PutObjectCommand({
        Bucket: "koala-oss-app",
        Key: imageName,
        Body: bytes,
        ContentType: "image/png",
      })
    );

    return imageName;
  } catch (e) {
    console.error("Screenshot error:", e);
    return null;
  }
}

// --- main ---
const input = Deno.args[0];
if (!input) {
  console.error("Usage: collect-news.ts '<json>'");
  Deno.exit(1);
}

const news = JSON.parse(input);

// Screenshot + upload (non-blocking for insert)
const imageName = await captureAndUploadScreenshot(news.url);

// Insert into Supabase
const { data, error } = await supabase
  .from("news")
  .insert([{
    url: news.url,
    title: news.title,
    content: news.content,
    draft: true,
    tags: news.tags,
    image: imageName,
    image_checked: false,
  }])
  .select()
  .single();

if (error) {
  console.error("Supabase error:", JSON.stringify(error));
  Deno.exit(1);
}

console.log(JSON.stringify(data));
