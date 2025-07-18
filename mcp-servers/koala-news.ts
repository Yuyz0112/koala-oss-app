import "jsr:@std/dotenv@0.225.3/load";
import { Server } from "npm:@modelcontextprotocol/sdk@1.6.1/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk@1.6.1/server/stdio.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk@1.6.1/types.js";
import { z } from "npm:zod@3.24.2";
import { zodToJsonSchema } from "npm:zod-to-json-schema@3.24.5";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { resolvePDFJS } from "npm:pdfjs-serverless@0.7.0";
import { assert } from "jsr:@std/assert@1.0.11";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3.787.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
assert(SUPABASE_URL, "SUPABASE_URL is required");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
assert(SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY is required");

// S3 Configuration
const S3_ACCOUNT_ID = Deno.env.get("S3_ACCOUNT_ID");
assert(S3_ACCOUNT_ID, "S3_ACCOUNT_ID is required");
const S3_ACCESS_KEY_ID = Deno.env.get("S3_ACCESS_KEY_ID");
assert(S3_ACCESS_KEY_ID, "S3_ACCESS_KEY_ID is required");
const S3_SECRET_ACCESS_KEY = Deno.env.get("S3_SECRET_ACCESS_KEY");
assert(S3_SECRET_ACCESS_KEY, "S3_SECRET_ACCESS_KEY is required");
const CF_API_TOKEN = Deno.env.get("CF_API_TOKEN");
assert(CF_API_TOKEN, "CF_API_TOKEN is required");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const READER_API_BASE = "https://r.jina.ai";
const JINA_API_KEY = Deno.env.get("JINA_API_KEY");
assert(JINA_API_KEY, "JINA_API_KEY is required");

// Initialize S3 client
const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});

/**
 * Converts a URL to a unique, readable image name
 * @param url URL to convert
 * @returns Converted image name with .png extension
 */
function urlToImageName(url: string): string {
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

/**
 * Takes a screenshot of a webpage and uploads it to S3
 * @param url URL to capture
 * @returns Image name stored in S3
 */
async function captureAndUploadScreenshot(url: string): Promise<string> {
  const imageName = urlToImageName(url);

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

  // Convert base64 to binary
  const binary = atob(body.result.screenshot);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Upload to S3
  await S3.send(
    new PutObjectCommand({
      Bucket: `koala-oss-app`,
      Key: imageName,
      Body: bytes,
      ContentType: `image/png`,
    })
  );

  return imageName;
}

async function extractPdfText(data: Uint8Array) {
  const { getDocument } = await resolvePDFJS();

  const pdf = await getDocument({ data }).promise;

  let text = "";
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    text += content.items
      .map((item: Record<string, unknown>) => {
        if ("str" in item) {
          return item.str;
        }
        return "";
      })
      .join("");
  }

  return text;
}

function parseMessageToJson(input: string) {
  // Regular expression to match JSON code blocks
  const jsonCodeBlockRegex = /```json\n([\s\S]*?)\n```/g;

  // Find all matches for JSON code blocks
  const matches = Array.from(input.matchAll(jsonCodeBlockRegex));

  if (matches.length > 1) {
    throw new Error("Multiple JSON code blocks found in the input string.");
  }

  let jsonString: string;

  if (matches.length === 1) {
    // Extract JSON content from the code block, trimming whitespace
    jsonString = matches[0][1].trim();
  } else {
    // No JSON code block found, use the entire input
    jsonString = input.trim();
  }

  try {
    // Parse the JSON string into an object
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Failed to parse JSON: " + error + "\n\n" + jsonString);
  }
}

const CollectFromLinkSchema = z.object({
  link: z.string(),
  customTitle: z.string().optional(),
  customContent: z.string().optional(),
});

const ParsePdfSchema = z.object({
  content: z.string(),
});

const NewsSchema = z.object({
  url: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(
    z.enum([
      "AI",
      "HARDWARE",
      "FRONTEND",
      "BACKEND",
      "SECURITY",
      "IOT",
      "CLOUD",
      "STARTUPS",
      "DATA",
      "TOOL",
    ])
  ),
});

const NewsArraySchema = z.array(NewsSchema);

const server = new Server(
  {
    name: "koala-news",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      logging: {},
      prompts: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "collect-from-link",
        description:
          "从链接中收集信息，生成 Koala 科技周报文案，可选自定义标题和内容",
        inputSchema: zodToJsonSchema(CollectFromLinkSchema),
      },
      {
        name: "parse-pdf",
        description: "从往期 PDF 归档文件中提取周报文案",
        inputSchema: zodToJsonSchema(ParsePdfSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "collect-from-link": {
        const { link, customTitle, customContent } =
          CollectFromLinkSchema.parse(args);
        const text = await fetch(`${READER_API_BASE}/${link}`, {
          headers: {
            Authorization: `Bearer ${JINA_API_KEY}`,
          },
        }).then((res) => res.text());

        // If customTitle or customContent is provided, use AI to generate only missing parts
        const samplingPrompt =
          customTitle && customContent
            ? `新闻原文：\n${text}\n\n用户已提供自定义标题和内容，请使用这些内容并仅生成合适的标签。
             自定义标题：${customTitle}
             自定义内容：${customContent}`
            : customTitle
            ? `新闻原文：\n${text}\n\n用户已提供自定义标题，请使用此标题并生成合适的内容和标签。
             自定义标题：${customTitle}`
            : customContent
            ? `新闻原文：\n${text}\n\n用户已提供自定义内容，请生成合适的标题和标签，并使用提供的内容。
             自定义内容：${customContent}`
            : `新闻原文：\n${text}`;

        const samplingResult = await server.createMessage({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: samplingPrompt,
              },
            },
          ],
          systemPrompt: `<requirements>
  <requirement>
  我是一个科技周报的编辑，以下是我的周报示例，请你学习我的写作风格。 
  之后我会给你发一些新闻，请以我的写作风格续写，输出中文。
  </requirement>
  <requirement>
  注意，我的周报是以视频的方式呈现，所以编写的内容应该易读和口语化，不要使用无法口播的 markdown list 结构、code 结构等。 
  保持简洁，每个项目的介绍字数不超过 200 字。
  </requirement>
  <requirement>
  以 JSON 形式返回 URL、title、content、tags 字段。
  tags 是 enum array 格式，enum item 和含义如下：
    "AI": 人工智能
    "HARDWARE": 硬件相关科技
    "FRONTEND": 软件前端
    "BACKEND": 软件后端
    "SECURITY": 安全
    "IOT": 物联网
    "CLOUD": 云计算
    "STARTUPS": 创业与投资
    "DATA": 数据库、大数据等
    "TOOL": 实用工具
  **仅选取关联性强的 tag 方便用户分类。不要使用上述 enum array 以外的 tag。**
  </requirement>
  <requirement>
  如果用户提供了自定义标题或内容，请尊重用户的输入，保留用户提供的内容。
  </requirement>
</requirements>

<example>
{
  "url": "https://www.dask.org/",
  "title": "Dask | Python 并行计算库",
  "content": "Dask 是一个并行计算库，能够轻松扩展你熟悉的 Python 工具，比如 Pandas、NumPy 和 Scikit-learn。它允许你在单机或分布式集群上处理大规模数据，而无需改变现有的代码逻辑。Dask 的核心优势在于它的易用性和灵活性，你可以像使用普通 Python 库一样使用它，同时享受分布式计算带来的性能提升。点评：Dask 特别适合处理超出内存限制的大型数据集，它通过延迟计算和任务调度优化资源使用。无论是数据科学、机器学习还是科学计算，Dask 都能帮助你高效完成任务。与 Python 生态系统的集成也让它更受欢迎。",
  "tags": ["DATA", "TOOL"]
}
</example>
`,
          maxTokens: 700,
        });

        // for validate
        const news = NewsSchema.parse(
          parseMessageToJson(samplingResult.content.text as string)
        );

        // Capture and upload screenshot
        let imageName = null;
        try {
          imageName = await captureAndUploadScreenshot(news.url);
        } catch (error) {
          console.error("Failed to capture screenshot:", error);
          // Continue even if screenshot fails
        }

        const { data, error } = await supabase
          .from("news")
          .insert([
            {
              url: news.url,
              title: news.title,
              content: news.content,
              draft: true,
              tags: news.tags,
              image: imageName, // Add the image field
              image_checked: false,
            },
          ])
          .select()
          .single();

        if (error) {
          throw new Error(JSON.stringify(error));
        }

        return {
          content: [
            {
              type: "text",
              text: "已将该链接收集为以下记录。",
            },
            {
              type: "resource",
              resource: {
                uri: `news://${data.id}`,
                mimeType: "application/json",
                text: JSON.stringify(data),
              },
            },
          ],
        };
      }
      case "parse-pdf": {
        const { content } = ParsePdfSchema.parse(args);
        const samplingResult = await server.createMessage({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `<user_query>
  以下 raw_content 中的文本是我一期科技周报的内容，其中包含项目介绍、文章推荐和一些口头语。把介绍的所有项目提取为包含 title, url, content, tags 的 json array，方便我存储。
  每个项目的 content 遵循我的文案原本内容，不做修改。
  提取项目 URL 时，如果你发现一个项目存在 hackernews 的 URL 和其他 URL，请以其他 URL 为准。
  title 提取为「$name | $summary」这样的格式，例如：Dask | Python 并行计算库。$summary 部分是项目的一句话标题，不超过 10 个字。
  tags 是 enum array 格式，enum item 和含义如下：
    "AI": 人工智能
    "HARDWARE": 硬件相关科技
    "FRONTEND": 软件前端
    "BACKEND": 软件后端
    "SECURITY": 安全
    "IOT": 物联网
    "CLOUD": 云计算
    "STARTUPS": 创业与投资
    "DATA": 数据库、大数据等
    "TOOL": 实用工具
  仅选取关联性强的 tag 方便用户分类。
</user_query>

<raw_content>
${content}
</raw_content>
`,
              },
            },
          ],
          systemPrompt: ``,
          maxTokens: 6000,
        });

        const newsArray = NewsArraySchema.parse(
          parseMessageToJson(samplingResult.content.text as string)
        );

        // Process each news item to capture screenshots
        const newsWithImages = await Promise.all(
          newsArray.map(async (news) => {
            let imageName = null;
            try {
              imageName = await captureAndUploadScreenshot(news.url);
            } catch (error) {
              console.error(
                `Failed to capture screenshot for ${news.url}:`,
                error
              );
              // Continue even if screenshot fails
            }

            return {
              url: news.url,
              title: news.title,
              content: news.content,
              draft: true,
              tags: news.tags,
              image: imageName,
            };
          })
        );

        const { data, error } = await supabase
          .from("news")
          .insert(newsWithImages)
          .select();

        if (error) {
          throw new Error(JSON.stringify(error));
        }

        const results: CallToolResult["content"] = [];
        if (data.length) {
          results.push({
            type: "text",
            text: "已将该 PDF 内容收集为以下记录。",
          });
          for (const d of data) {
            results.push({
              type: "resource" as const,
              resource: {
                uri: `news://${d.id}`,
                mimeType: "application/json",
                text: JSON.stringify(d),
              },
            });
          }
        }

        return {
          content: results,
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "收集新闻",
        description:
          "将新闻/项目链接制作为周报文案，返回包含 url、title、content 的 JSON 结构",
        arguments: [
          {
            name: "link",
            description: "新闻链接，例如 https://www.dask.org/",
            required: true,
          },
          {
            name: "customTitle",
            description: "自定义标题（可选）",
            required: false,
          },
          {
            name: "customContent",
            description: "自定义内容（可选）",
            required: false,
          },
        ],
      },
      {
        name: "解析往期 PDF",
        description:
          "从往期 PDF 中解析文案内容，返回包含 url、title、content 的 JSON 数组结构",
        arguments: [
          {
            name: "content",
            description: "PDF 文件内容",
            required: true,
            xInputType: "file",
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "收集新闻": {
      if (!args?.link) {
        throw new Error(`"link" is required`);
      }

      // Build prompt based on whether customTitle and customContent are provided
      let promptText = `请从链接 "${args.link}" 中读取新闻，并转换为科技周报文案。`;
      if (args.customTitle) {
        promptText += `\n\n请使用以下自定义标题: "${args.customTitle}"`;
      }
      if (args.customContent) {
        promptText += `\n\n请使用以下自定义内容: "${args.customContent}"`;
      }

      return {
        description: "将新闻/项目链接制作为周报文案",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText,
            },
          },
        ],
      };
    }
    case "解析往期 PDF": {
      if (!args?.content) {
        throw new Error(`"content" is required`);
      }
      const base64Data = args.content.split(",")[1];
      const binaryString = atob(base64Data);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      const text = await extractPdfText(uint8Array);

      return {
        description: "从往期 PDF 中解析文案内容",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `请从以下 PDF 文案中解析科技周报内容。\n\n${text}`,
            },
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Koala News MCP Server running on stdio");
