// deno-lint-ignore-file require-await
import "jsr:@std/dotenv@0.225.3/load";
import { Node } from "npm:pocketflow";
import { checkImage } from "./utils/check-image.ts";
import { markImageCheckResult, putImage, urlToImageName } from "./utils/db.ts";
import { captureScreenshot } from "./utils/browser-render.ts";
import { parseCoverImage } from "./utils/html-parser.ts";
import { aiGenerateImage } from "./utils/ai-gen.ts";

export type SharedStorage = {
  news: {
    id: number;
    image: string;
    image_checked: boolean | null;
    url: string;
    title: string;
    content: string;
  };
  visualCheck?: {
    sufficient: boolean;
    reason: string;
  };
  retryStage?: RetryStage;
  imageToCheck?: Uint8Array;
  html?: string;
};

export enum Actions {
  NeedCheck = "NeedCheck",
  CheckPassed = "CheckPassed",
  FirstCheckFailed = "FirstCheckFailed",
  DelaySnapshotCheckFailed = "DelaySnapshotCheckFailed",
  HTMLParseCheckFailed = "HTMLParseCheckFailed",
  AIGenerateCheckFailed = "AIGenerateCheckFailed",
}

enum RetryStage {
  DelaySnapshot = "DelaySnapshot",
  HTMLParse = "HTMLParse",
  AIGenerate = "AIGenerate",
}

export class VisualCheckNode extends Node<SharedStorage> {
  constructor(maxRetries?: number) {
    super(maxRetries);
  }

  override async prep(
    shared: SharedStorage
  ): Promise<Pick<SharedStorage, "news" | "imageToCheck">> {
    return {
      news: shared.news,
      imageToCheck: shared.imageToCheck,
    };
  }

  override async exec({
    news,
    imageToCheck,
  }: Pick<SharedStorage, "news" | "imageToCheck">): Promise<{
    sufficient: boolean;
    reason: string;
  }> {
    console.log(`Checking image for news ${news.id} ${news.title}...`);

    const result = await checkImage(
      imageToCheck ?? `https://r2.koala-oss.app/${news.image}`
    );

    if (!result.sufficient) {
      console.log(
        `Image check failed for news ID ${news.id}: ${result.reason}`
      );
    }

    return result;
  }

  override async post(
    shared: SharedStorage,
    _: unknown,
    { sufficient, reason }: { sufficient: boolean; reason: string }
  ): Promise<string | undefined> {
    shared.visualCheck = {
      sufficient,
      reason,
    };

    if (sufficient) {
      return Actions.CheckPassed;
    }

    if (!shared.retryStage) {
      return Actions.FirstCheckFailed;
    }

    if (shared.retryStage === RetryStage.DelaySnapshot) {
      return Actions.DelaySnapshotCheckFailed;
    }

    if (shared.retryStage === RetryStage.HTMLParse) {
      return Actions.HTMLParseCheckFailed;
    }

    if (shared.retryStage === RetryStage.AIGenerate) {
      return Actions.AIGenerateCheckFailed;
    }
  }
}

export class UpdateNewsNode extends Node<SharedStorage> {
  constructor(maxRetries?: number) {
    super(maxRetries);
  }

  override async prep(
    shared: SharedStorage
  ): Promise<Pick<SharedStorage, "news" | "visualCheck" | "imageToCheck">> {
    return {
      news: shared.news,
      visualCheck: shared.visualCheck,
      imageToCheck: shared.imageToCheck,
    };
  }

  override async exec({
    news,
    visualCheck,
    imageToCheck,
  }: Pick<
    SharedStorage,
    "news" | "visualCheck" | "imageToCheck"
  >): Promise<void> {
    if (!visualCheck) {
      throw new Error("Visual check result is not available.");
    }

    if (visualCheck.sufficient && imageToCheck) {
      const imageName = urlToImageName(news.url);
      await putImage(imageName, imageToCheck);
    }

    await markImageCheckResult(news.id, visualCheck.sufficient);

    console.log(`News ID ${news.id} image check passed.`);
  }

  override async post(): Promise<string | undefined> {
    return;
  }
}

export class DelaySnapshotNode extends Node<SharedStorage> {
  constructor(maxRetries?: number) {
    super(maxRetries);
  }

  override async prep(
    shared: SharedStorage
  ): Promise<Pick<SharedStorage, "news">> {
    return {
      news: shared.news,
    };
  }

  override exec({ news }: Pick<SharedStorage, "news">): Promise<{
    screenshot: string;
    content: string;
  }> {
    console.log(`Taking delayed screenshot for news ID ${news.id}...`);

    return captureScreenshot(news.url, 5_000);
  }

  override async post(
    shared: SharedStorage,
    _: unknown,
    {
      screenshot,
      content,
    }: {
      screenshot: string;
      content: string;
    }
  ): Promise<string | undefined> {
    shared.retryStage = RetryStage.DelaySnapshot;

    const binary = atob(screenshot);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    shared.imageToCheck = bytes;

    shared.html = content;

    return Actions.NeedCheck;
  }
}

export class HTMLParseNode extends Node<SharedStorage> {
  constructor(maxRetries?: number) {
    super(maxRetries);
  }

  override async prep(
    shared: SharedStorage
  ): Promise<Pick<SharedStorage, "news" | "html">> {
    return {
      news: shared.news,
      html: shared.html,
    };
  }

  override async exec({
    news,
    html,
  }: Pick<SharedStorage, "news" | "html">): Promise<{
    candidate: Uint8Array | null;
  }> {
    console.log(`Parsing HTML for news ID ${news.id}...`);

    if (!html) {
      html = await fetch(news.url).then((res) => res.text());
    }

    return {
      candidate: await parseCoverImage(html ?? "", news.url),
    };
  }

  override async post(
    shared: SharedStorage,
    _: unknown,
    {
      candidate,
    }: {
      candidate: Uint8Array | null;
    }
  ): Promise<string | undefined> {
    shared.retryStage = RetryStage.HTMLParse;

    if (!candidate) {
      return Actions.HTMLParseCheckFailed;
    }

    shared.imageToCheck = candidate;
    return Actions.NeedCheck;
  }
}

export class AIGenerateNode extends Node<SharedStorage> {
  constructor(maxRetries?: number) {
    super(maxRetries);
  }

  override prep(shared: SharedStorage): Promise<Pick<SharedStorage, "news">> {
    return Promise.resolve({
      news: shared.news,
    });
  }

  override async exec({ news }: Pick<SharedStorage, "news">): Promise<{
    image: Uint8Array | null;
  }> {
    console.log(`Generating image for news ID ${news.id}...`);

    return {
      image: await aiGenerateImage(news.title, news.content),
    };
  }

  override async post(
    shared: SharedStorage,
    _: unknown,
    { image }: { image: Uint8Array | null }
  ): Promise<string | undefined> {
    shared.retryStage = RetryStage.AIGenerate;

    if (!image) {
      return Actions.AIGenerateCheckFailed;
    }

    shared.imageToCheck = image;

    return Actions.NeedCheck;
  }
}

export class HumanFeedbackNode extends Node<SharedStorage> {
  constructor(maxRetries?: number) {
    super(maxRetries);
  }

  override prep(shared: SharedStorage): Promise<Pick<SharedStorage, "news">> {
    return Promise.resolve({
      news: shared.news,
    });
  }

  override async exec({ news }: Pick<SharedStorage, "news">): Promise<void> {
    console.warn("News needs human feedback:", news.id, news.title);
  }
}
