import { assert } from "jsr:@std/assert@1.0.11";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.787.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
assert(SUPABASE_URL, "SUPABASE_URL is required");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
assert(SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY is required");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// S3 Configuration
const S3_ACCOUNT_ID = Deno.env.get("S3_ACCOUNT_ID");
assert(S3_ACCOUNT_ID, "S3_ACCOUNT_ID is required");
const S3_ACCESS_KEY_ID = Deno.env.get("S3_ACCESS_KEY_ID");
assert(S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID is required");
const S3_SECRET_ACCESS_KEY = Deno.env.get("S3_SECRET_ACCESS_KEY");
assert(S3_SECRET_ACCESS_KEY, "S3_SECRET_ACCESS_KEY is required");
const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN");
assert(CF_API_TOKEN, "CF_API_TOKEN is required");

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

export async function putImage(imageName: string, bytes: Uint8Array) {
  await S3.send(
    new PutObjectCommand({
      Bucket: `koala-oss-app`,
      Key: imageName,
      Body: bytes,
      ContentType: `image/png`,
    })
  );
}

export async function markImageCheckResult(
  id: number,
  sufficient: boolean,
  imageName: string
) {
  await supabase
    .from("news")
    .update({ image_checked: sufficient, image: imageName })
    .eq("id", id);
}

export function urlToImageName(url: string): string {
  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    throw new Error("Invalid URL");
  }

  const urlObj = new URL(url);

  // Get base name from hostname
  let name = urlObj.hostname.replace(/^www\./, "");

  // Get full path and process
  if (urlObj.pathname && urlObj.pathname !== "/") {
    // Remove leading slash, replace all slashes with hyphens
    const pathPart = urlObj.pathname.replace(/^\//, "").replace(/\//g, "-");
    name += "-" + pathPart;
  }

  // Normalize filename (remove special characters, convert to lowercase)
  name = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return name + ".png";
}

export async function listNotChecked() {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .filter("image_checked", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch not checked images: ${error.message}`);
  }

  return data || [];
}
