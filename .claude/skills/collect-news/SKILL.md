---
name: collect-news
description: 从用户提供的 URL 链接收集科技周报素材。当用户提供 URL 并希望收录为科技周报内容时使用此 skill。
argument-hint: <url> [url2] [url3] ...
allowed-tools: Bash(deno:*), WebFetch
---

# 收集科技周报素材

将用户提供的 URL 收集为科技周报记录，完成截图并存入数据库。

## 流程

对用户提供的每个 URL，执行以下步骤（多个 URL 时尽量并行处理）：

### 1. 抓取网页内容

使用 WebFetch 工具抓取 `https://r.jina.ai/<url>` 获取网页正文。

### 2. 生成周报文案

根据抓取到的内容，**你自己直接生成**以下 JSON（不需要调用额外 API）：

```json
{
  "url": "原始 URL",
  "title": "项目名 | 一句话简介（不超过10字）",
  "content": "200字以内的中文介绍",
  "tags": ["TAG1", "TAG2"]
}
```

**写作风格要求：**
- 周报以视频形式呈现，内容应口语化、易读，适合口播
- 不要使用 markdown list、code block 等无法口播的结构
- content 分两段：**介绍段** + **点评段**
  - 介绍段：说清楚项目是什么、解决什么问题、核心亮点，口语化
  - 点评段：以「点评：」开头，站在科技编辑的视角给出分析——放到行业背景中评价意义、与同类方案对比、适用场景、潜在局限等。点评要有观点，不要泛泛而谈
- 两段之间用 `\n` 分隔
- title 格式为「项目名 | 功能定位短语」，定位短语不超过 10 字，是名词短语而非句子（如"树形 Diff 阅读器"、"边缘设备语音识别"）
- 介绍段用**具体细节**支撑：提到技术选型、知名用户、量化数据等，避免空泛描述
- 点评段要**有立场**：可以指出局限性、放到行业趋势中定位、给出适用前提，不要只说好话
- 不要用"大家好"、"给大家介绍"等开头套话，直接进入主题
- 如果用户提供了自定义标题或内容，尊重并保留用户输入

**tags 可选值（仅选关联性强的）：**
- `AI` - 人工智能
- `HARDWARE` - 硬件相关科技
- `FRONTEND` - 软件前端
- `BACKEND` - 软件后端
- `SECURITY` - 安全
- `IOT` - 物联网
- `CLOUD` - 云计算
- `STARTUPS` - 创业与投资
- `DATA` - 数据库、大数据等
- `TOOL` - 实用工具

**参考示例（学习风格，不要照搬内容）：**

示例 1：
```json
{
  "url": "https://github.com/dlvhdr/diffnav",
  "title": "Diffnav | 树形 Diff 阅读器",
  "content": "Diffnav 给 git diff 加上 GitHub 风格的侧边文件树。基于 Delta 做语法高亮，用 Bubble Tea 做终端界面，支持文件跳转和搜索。解决的是命令行里看大量文件变更时迷失方向的问题。\n点评：小而精的工具，作者 Dlvhdr 之前做过 gh-dash，对开发者工作流理解很深。目前在 AI 高速生成代码的阶段，怎么 review 代码，是否 review 代码，都在激烈的讨论中，任何有生产力提升的工具都可能获得用户。",
  "tags": ["TOOL", "FRONTEND"]
}
```

示例 2：
```json
{
  "url": "https://www.promptfoo.dev/",
  "title": "Promptfoo | LLM 的测试驱动开发",
  "content": "Promptfoo 是一个开源的 LLM 测试框架，支持用 YAML 定义测试用例，自动对比多个模型输出，还能检查 Prompt 注入等安全风险。它强调测试驱动的 LLM 开发，而不是反复试错。支持接入 CI/CD，也提供合规报告映射到 OWASP、NIST 等标准。\n点评：LLM 应用进入生产环境后，可观测性和测试覆盖是两大痛点。Promptfoo 把传统软件测试的方法论引入 AI 领域，这种思路比单纯依赖人工评估更可持续。前段时间 Anthropic 发布的博客中，提到他们内部也在使用这个工具做 Agent 质量评估，也是让 Promptfoo 获得了更多的关注。",
  "tags": ["AI", "SECURITY", "TOOL"]
}
```

示例 3：
```json
{
  "url": "https://github.com/googleworkspace/cli",
  "title": "gws | Google Workspace 统一命令行工具",
  "content": "Google 推出 gws，用统一命令行控制 Drive、Gmail、Calendar 等全部 Workspace 服务。它选择在运行时读取 Google 的 Discovery Service 动态生成命令，API 一旦更新，客户端自动同步。还内置了四十多个 AI Agent 技能，并且原生支持 Gemini CLI 扩展。\n点评：CLI 现在是帮助 SaaS 服务融入 Agent 生态的重要手段，Google Workspace 服务有着大量的用户，办公场景又是 Agent 服务的重点领域，本次 Google 推出 gws，预计会解锁更多 Agent 办公场景。gws 的动态服务发现机制也体现了设计上的深思熟虑，比已有的不少第三方 MCP 形态集成方案更加易于维护。",
  "tags": ["TOOL", "CLOUD"]
}
```

### 3. 截图 + 上传 + 入库

在 `mcp-servers/` 目录下运行脚本，传入第 2 步生成的 JSON：

```bash
cd mcp-servers && deno run -A --node-modules-dir=auto ../.claude/skills/collect-news/scripts/collect-news.ts '<json>'
```

脚本会自动完成：截图上传到 R2、插入 Supabase，并输出插入的记录。

**注意：** JSON 参数通过单引号包裹传入，内部的双引号无需转义。如果 content 中包含单引号，需要转义为 `'\''`。

### 4. 输出结果

简洁地告知用户收集结果，包含标题和 ID。如有失败项，说明原因。
