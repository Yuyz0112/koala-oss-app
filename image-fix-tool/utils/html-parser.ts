import { DOMParser, Element } from "jsr:@b-fuze/deno-dom";

export async function parseCoverImage(
  html: string,
  baseUrl: string
): Promise<Uint8Array | null> {
  const doc = new DOMParser().parseFromString(html, "text/html");

  if (!doc) return null;

  const resolve = (src: string | null) =>
    src && baseUrl ? new URL(src, baseUrl).href : src ?? null;

  const pickAttr = (
    selector: string,
    attr: "content" | "href" | "src" = "content"
  ): string | null => {
    const el = doc.querySelector(selector) as Element | null;
    if (!el) return null;
    const val = el.getAttribute(attr) as string | undefined;
    return val ? val.trim() : null;
  };

  // ---------- 1. Open Graph ----------
  const ogTags = [
    'meta[property="og:image:secure_url"]',
    'meta[property="og:image:url"]',
    'meta[property="og:image"]',
    'meta[name="og:image"]',
  ];
  for (const s of ogTags) {
    const url = resolve(pickAttr(s));
    if (url) {
      return toBytes(url);
    }
  }

  // ---------- 2. Twitter Card ----------
  const twitterTags = [
    'meta[name="twitter:image"]',
    'meta[property="twitter:image"]',
  ];
  for (const s of twitterTags) {
    const url = resolve(pickAttr(s));
    if (url) {
      return toBytes(url);
    }
  }

  // ---------- 3. <link rel="image_src"> ----------
  const linkUrl = resolve(pickAttr('link[rel="image_src"]', "href"));
  if (linkUrl) {
    return toBytes(linkUrl);
  }

  // ---------- 4. <img> ----------
  const heroImg = doc.querySelector(
    'img[id*="hero"], img[class*="hero"], img[id*="cover"], img[class*="cover"]'
  ) as Element | null;
  if (heroImg) {
    const url = resolve(heroImg.getAttribute("src"));
    if (url) {
      return toBytes(url);
    }
  }

  return null;
}

async function toBytes(url: string) {
  console.log(`Fetching image from: ${url}`);
  const response = await fetch(url);
  if (response.ok) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes;
  }

  return null;
}
