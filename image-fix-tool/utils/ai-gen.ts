import { experimental_generateImage } from "npm:ai@4.3.16";
import { openai } from "npm:@ai-sdk/openai@1.3.22";

export async function aiGenerateImage(
  title: string,
  content: string
): Promise<Uint8Array> {
  const { image } = await experimental_generateImage({
    model: openai.image("dall-e-3"),
    prompt: [
      `<requirement>为一篇科技新闻生成社交媒体封面图，要求 1:1（1024×1024 px）</requirement>`,
      `<news_info>${title}\n\n${content}</news_info>`,
      `<style>主体元素居中或 2/3 分割；留 10–15% 安全边距, 扁平插画风 / 未来主义 UI / isometric 3D（3 选 1）</style>`,
      `<rules>避免多余文字、水印；不出现真人面孔；不出现任何品牌 Logo</rules>`,
    ].join("\n"),
    n: 1,
    size: "1024x1024",
  });

  return image.uint8Array;
}
