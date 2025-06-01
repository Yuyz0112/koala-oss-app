import { assert } from "jsr:@std/assert@1.0.11";

const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN");
assert(CF_API_TOKEN, "CF_API_TOKEN is required");
const S3_ACCOUNT_ID = Deno.env.get("S3_ACCOUNT_ID");
assert(S3_ACCOUNT_ID, "S3_ACCOUNT_ID is required");

export async function captureScreenshot(
  url: string,
  waitForTimeout?: number
): Promise<{
  screenshot: string;
  content: string;
}> {
  // Custom CSS for GitHub repositories
  const addStyleTag = url.startsWith(`https://github.com`)
    ? [
        {
          content: `.header-wrapper,
          #repository-container-header,
          react-partial[partial-name="repos-overview"] div[data-target="react-partial.reactRoot"] div.Box-sc-g0xbh4-0.iNSVHo,
          table[aria-labelledby="folders-and-files"] { display: none; }

          .repository-content .container-xl {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          .Box-sc-g0xbh4-0.iVEunk {
            margin-top: 0;
          }
          .vIPPs {
            gap: 0;
          }`,
        },
      ]
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
        screenshotOptions: {
          fullPage: false,
        },
        viewport: {
          width: 600,
          height: 600,
          deviceScaleFactor: 2,
          isMobile: true,
        },
        addStyleTag,
        gotoOptions: { waitUntil: "networkidle0", timeout: 20_000 },
        waitForTimeout: waitForTimeout,
      }),
    }
  );

  const body: {
    success: boolean;
    result: {
      screenshot: string;
      content: string;
    };
  } = await res.json();

  if (!body.success) {
    throw new Error(`Failed to capture screenshot: ${JSON.stringify(body)}`);
  }

  return body.result;
}
