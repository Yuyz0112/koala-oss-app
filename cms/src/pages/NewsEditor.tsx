import { db, News } from "@/lib/db";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/query";
import { toast } from "sonner";

function countWords(text: string) {
  // 匹配中文字符
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  // 匹配英文单词
  const englishWords = text
    .split(/\s+/)
    .filter((word) => /^[a-zA-Z]+$/.test(word));

  // 中文字符数量
  const chineseCount = chineseChars ? chineseChars.length : 0;
  // 英文单词数量
  const englishCount = englishWords.length;

  return chineseCount + englishCount;
}

export default function NewsEditor({ id }: { id: number }) {
  const { data, error, isPending } = useQuery({
    queryKey: ["news", id],
    queryFn: () => {
      return db.getNews(id);
    },
  });
  const [value, setValue] = useState<News>({
    id: 0,
    title: "",
    url: "",
    content: "",
    created_at: "",
    draft: false,
    tags: [],
  });
  useEffect(() => {
    if (data) {
      setValue(data);
    }
  }, [data]);

  const { mutate, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      try {
        const result = await db.updateNews(value);
        toast.success("修改成功!", {
          duration: 1500,
        });
        return result;
      } catch (err) {
        toast.error("修改失败，请重试", {
          description: <>{err}</>,
          duration: 2000,
        });
        console.error("Failed to copy: ", err);
      }
    },
    mutationKey: ["news", id],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });
  const { mutate: deleteNews, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      try {
        const result = await db.deleteNews(id);
        toast.success("删除成功!", {
          duration: 1500,
        });
        return result;
      } catch (err) {
        toast.error("删除失败，请重试", {
          description: <>{err}</>,
          duration: 2000,
        });
        console.error("Failed to copy: ", err);
      }
    },
    mutationKey: ["news", id],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });

  const handleCopy = async () => {
    const text = [value.url, `> ${value.title}\n`, value.content].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("复制成功!", {
        duration: 1500,
      });
    } catch (err) {
      toast.error("复制失败，请重试", {
        duration: 2000,
      });
      console.error("Failed to copy: ", err);
    }
  };

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return <div>News not found</div>;
  }

  return (
    <div className="p-4 space-y-4 w-full">
      <div className="bg-slate-100 pl-1 flex justify-between items-center">
        <div />
        <Button
          variant="ghost"
          className="text-red-500"
          disabled={isDeleting}
          onClick={() => {
            deleteNews();
          }}
        >
          delete
        </Button>
      </div>
      <div className="space-x-2 flex items-center ">
        <Switch
          id="draft"
          checked={value.draft}
          // onchange
          onCheckedChange={(checked) => {
            setValue({ ...value, draft: checked });
          }}
        />
        <Label htmlFor="draft">Draft</Label>
      </div>

      <div className="space-y-2">
        <Label>URL</Label>
        <Input
          value={value.url}
          onChange={(evt) => {
            setValue({ ...value, url: evt.target.value });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>标签（,分隔）</Label>
        <Input
          value={value.tags.join(",")}
          onChange={(evt) => {
            setValue({ ...value, tags: evt.target.value.split(",") });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>标题</Label>
        <Input
          value={value.title}
          onChange={(evt) => {
            setValue({ ...value, title: evt.target.value });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>内容</Label>
        <Textarea
          value={value.content}
          onChange={(evt) => {
            setValue({ ...value, content: evt.target.value });
          }}
          rows={10}
        />
        <div className="text-sm text-gray-500">
          {countWords(value.content)} words
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => mutate()} disabled={isUpdating}>
          Save
        </Button>

        <Button variant="outline" onClick={handleCopy}>
          Copy
        </Button>
      </div>
    </div>
  );
}
