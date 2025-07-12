import { generateObject } from "npm:ai";
import { google } from "npm:@ai-sdk/google";
import { z } from "npm:zod";

export async function checkImage(image: string | Uint8Array) {
  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `<requirement>这是一个自动截图生成的科技周报新闻封面。请帮我检查一下图片中是否内容为空或者未加载完整或者是加载错误提示，因为自动截图可能因为网页加载时机等问题不太满足要求。</requirement>`,
                `<response_format>{"sufficient": boolean, "reason": string}</response_format>`,
              ].join("\n"),
            },
            {
              type: "image",
              image: image,
            },
          ],
        },
      ],
      schema: z.object({
        sufficient: z.boolean(),
        reason: z.string().describe("max length: 32 characters"),
      }),
      maxRetries: 1,
    });

    return object;
  } catch (error) {
    return {
      sufficient: false,
      reason: String(error),
    };
  }
}
