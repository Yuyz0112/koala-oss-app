import { useEffect, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import { toast } from "sonner";
import type { News } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import "@fontsource/fusion-pixel-12px-proportional-sc";

const W = 1280;
const H = 720;
const PIXEL_FONT = '"Fusion Pixel 12px Proportional SC", monospace';
const ISSUE_KEY = "cover:lastIssue";
/** 像素字体只有 400 字重，用同色偏移阴影模拟粗体 */
const bold = (px: number) => ({ textShadow: `${px}px 0 0 currentColor` });

/** 从 "项目名 | 功能定位短语" 中取右半部分作为封面条目 */
function subtitleOf(title: string) {
  const idx = title.indexOf("|");
  return (idx >= 0 ? title.slice(idx + 1) : title).trim();
}

function loadLastIssue() {
  try {
    const v = Number(localStorage.getItem(ISSUE_KEY));
    return v > 0 ? v + 1 : 1;
  } catch {
    return 1;
  }
}

function PointerHand() {
  // 白底黑边的卡通手，食指指向左侧，位于窗口右下角
  const stroke = { fill: "#fff", stroke: "#111", strokeWidth: 5 };
  return (
    <svg
      viewBox="0 0 100 100"
      width={170}
      height={170}
      style={{ position: "absolute", right: 0, bottom: 22 }}
    >
      {/* 手掌 */}
      <rect x="42" y="30" width="54" height="62" rx="14" {...stroke} />
      {/* 三根弯曲的手指 */}
      <rect x="34" y="52" width="40" height="14" rx="7" {...stroke} />
      <rect x="34" y="66" width="40" height="14" rx="7" {...stroke} />
      <rect x="36" y="80" width="38" height="12" rx="6" {...stroke} />
      {/* 食指 */}
      <rect x="4" y="32" width="66" height="18" rx="9" {...stroke} />
      {/* 拇指 */}
      <path
        d="M50 34 C52 18 66 12 78 20 C84 24 84 32 78 36 Z"
        {...stroke}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cover({
  issue,
  lines,
}: {
  issue: string;
  lines: string[];
}) {
  return (
    <div
      style={{
        width: W,
        height: H,
        background: "#FF7A45",
        position: "relative",
        overflow: "hidden",
        fontFamily: PIXEL_FONT,
        color: "#111",
      }}
    >
      {/* 左上：栏目名 + 期数 */}
      <div style={{ position: "absolute", left: 76, top: 62 }}>
        <div
          style={{
            color: "#fff",
            fontSize: 68,
            lineHeight: 1,
            letterSpacing: 2,
            ...bold(3),
          }}
        >
          科技周报
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 34,
            lineHeight: 1,
            marginTop: 14,
            letterSpacing: 4,
            ...bold(2),
          }}
        >
          WEEKLY #{issue}
        </div>
      </div>

      {/* 左中：主标题 */}
      <div style={{ position: "absolute", left: 76, top: 300 }}>
        <div style={{ fontSize: 84, lineHeight: 1, letterSpacing: 2, ...bold(4) }}>
          一周速报
        </div>
        <div
          style={{
            fontSize: 84,
            lineHeight: 1,
            marginTop: 22,
            marginLeft: 82,
            letterSpacing: 2,
            ...bold(4),
          }}
        >
          科技前沿资讯
        </div>
      </div>

      {/* 右侧：窗口 */}
      <div
        style={{
          position: "absolute",
          left: 690,
          top: 92,
          width: 492,
          height: 546,
          background: "#F0F0F0",
          border: "6px solid #111",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: 44,
            background: "#1BB9B7",
            borderBottom: "6px solid #111",
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            gap: 10,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: "#fff",
                display: "block",
              }}
            />
          ))}
        </div>
        <div
          style={{
            padding: "12px 12px 0 12px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {lines.map((text, i) => (
            <div
              key={i}
              style={{
                height: 60,
                background: "#111",
                color: "#fff",
                fontSize: 30,
                lineHeight: "60px",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                boxShadow: "8px 8px 0 #6B5A1E",
                letterSpacing: 1,
                ...bold(1.5),
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>

      <PointerHand />
    </div>
  );
}

/** 与详情页一致的文案格式，条目间用 --- 分隔 */
function formatCopyText(items: News[]) {
  return items
    .map((it) => [it.url, `> ${it.title}\n`, it.content].join("\n"))
    .join("\n---\n");
}

export default function SelectionPanel({ items }: { items: News[] }) {
  const [issue, setIssue] = useState(() => String(loadLastIssue()));
  // 按 id 记录用户改过的条目文字，选择增减时不丢失
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const lines = items.map((it) => overrides[it.id] ?? subtitleOf(it.title));
  const [busy, setBusy] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  // 预览按容器宽度等比缩放
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rememberIssue = () => {
    try {
      localStorage.setItem(ISSUE_KEY, issue);
    } catch {
      /* ignore */
    }
  };

  const withBusy = async (fn: () => Promise<void>) => {
    if (!coverRef.current) return;
    setBusy(true);
    try {
      await document.fonts.ready;
      await fn();
      rememberIssue();
    } catch (e) {
      toast.error(`失败: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const copyImage = () =>
    withBusy(async () => {
      const blob = await toBlob(coverRef.current!, {
        width: W,
        height: H,
        pixelRatio: 1,
        cacheBust: true,
      });
      if (!blob) throw new Error("渲染失败");
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("已复制封面图片");
    });

  const downloadImage = () =>
    withBusy(async () => {
      const dataUrl = await toPng(coverRef.current!, {
        width: W,
        height: H,
        pixelRatio: 1,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `weekly-${issue}.png`;
      a.click();
      toast.success(`已下载 weekly-${issue}.png`);
    });

  const text = formatCopyText(items);
  const copyText = async () => {
    await navigator.clipboard.writeText(text);
    toast.success(`已复制 ${items.length} 条文案`);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 上：封面 */}
      <div className="flex flex-col gap-3 p-3 border-b">
        <div className="flex items-center gap-2">
          <Label htmlFor="issue" className="shrink-0">
            期数
          </Label>
          <Input
            id="issue"
            className="w-24"
            value={issue}
            onChange={(e) => setIssue(e.target.value.replace(/\D/g, ""))}
          />
          <div className="flex-1" />
          <Button size="sm" onClick={copyImage} disabled={busy}>
            复制图片
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadImage}
            disabled={busy}
          >
            下载 PNG
          </Button>
        </div>
        <div ref={previewRef} className="w-full">
          <div
            style={{
              width: W * scale,
              height: H * scale,
              overflow: "hidden",
              boxShadow: "0 0 0 1px rgba(0,0,0,.1)",
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: W,
                height: H,
              }}
            >
              <div ref={coverRef}>
                <Cover issue={issue} lines={lines} />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((it, i) => (
            <Input
              key={it.id}
              className="h-8 text-sm"
              value={lines[i]}
              onChange={(e) =>
                setOverrides((prev) => ({ ...prev, [it.id]: e.target.value }))
              }
            />
          ))}
        </div>
      </div>

      {/* 下：文字 */}
      <div className="flex-1 flex flex-col gap-2 p-3 min-h-0">
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground">
            文案 · {items.length} 条
          </span>
          <div className="flex-1" />
          <Button size="sm" onClick={copyText}>
            复制文字
          </Button>
        </div>
        <Textarea
          readOnly
          value={text}
          className="flex-1 resize-none font-mono text-xs"
        />
      </div>
    </div>
  );
}
