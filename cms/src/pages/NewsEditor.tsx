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
import { UploadIcon } from "lucide-react";

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
    image: null,
    title: "",
    url: "",
    content: "",
    created_at: "",
    draft: false,
    tags: [],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (data) {
      setValue(data);
      if (data.image) {
        setImagePreview(`https://r2.koala-oss.app/${data.image}`);
      } else {
        setImagePreview(null);
      }
    }
  }, [data]);

  const { mutate, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      try {
        // 如果有图片文件，先上传图片
        let newImageName = value.image;
        if (imageFile) {
          setIsUploading(true);
          try {
            newImageName = await uploadImage(imageFile, value.url);
          } catch (err) {
            throw new Error(`图片上传失败: ${err}`);
          } finally {
            setIsUploading(false);
          }
        }

        // 更新新闻记录
        const updatedValue = { ...value, image: newImageName };
        const result = await db.updateNews(updatedValue);
        toast.success("修改成功!", {
          duration: 1500,
        });
        return result;
      } catch (err) {
        toast.error("修改失败，请重试", {
          description: <>{err}</>,
          duration: 2000,
        });
        console.error("Failed to update: ", err);
      }
    },
    mutationKey: ["news", id],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      // 清除临时上传状态
      setImageFile(null);
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
        console.error("Failed to delete: ", err);
      }
    },
    mutationKey: ["news", id],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
  });

  // 上传图片到 R2 存储的函数
  async function uploadImage(file: File, url: string): Promise<string> {
    // 生成基于URL的图片名称
    const imageName = urlToImageName(url);

    // 创建 FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("imageName", imageName);
    formData.append("newsId", id.toString());

    try {
      // 调用外部图片上传 API
      const response = await fetch(import.meta.env.VITE_UPLOAD_IMAGE_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "图片上传失败");
      }

      const data = await response.json();
      return data.imageName; // 返回存储的图片名称
    } catch (error) {
      console.error("上传图片错误:", error);
      throw error;
    }
  }

  // 处理图片选择
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 验证文件大小（限制为5MB）
      if (file.size > 5 * 1024 * 1024) {
        toast.error("图片大小不能超过5MB");
        return;
      }

      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        toast.error("请上传图片文件");
        return;
      }

      setImageFile(file);

      // 创建本地预览
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 移除当前图片
  const handleRemoveImage = () => {
    setValue({ ...value, image: null });
    setImageFile(null);
    setImagePreview(null);
  };

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

  /**
   * 将 URL 转换为唯一且可读的图片名称
   * @param url 需要转换的 URL
   * @returns 转换后的图片名称，带 .png 扩展名
   */
  function urlToImageName(url: string): string {
    // 验证 URL
    try {
      new URL(url);
    } catch {
      throw new Error("无效的 URL");
    }

    const urlObj = new URL(url);

    // 从主机名获取基础名称
    let name = urlObj.hostname.replace(/^www\./, "");

    // 获取完整路径并处理
    if (urlObj.pathname && urlObj.pathname !== "/") {
      // 移除开头的斜杠，将所有斜杠替换为短横线
      const pathPart = urlObj.pathname.replace(/^\//, "").replace(/\//g, "-");
      name += "-" + pathPart;
    }

    // 规范化文件名（移除特殊字符，转换为小写）
    name = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return name + ".png";
  }

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
        <Label>封面图片</Label>
        <div className="flex flex-col gap-4">
          {imagePreview && (
            <div className="relative group">
              <img
                src={imagePreview}
                alt="预览图"
                className="w-[300px] h-auto object-cover rounded-md"
              />
              <div className="absolute inset-0  bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 left-2"
                >
                  移除
                </Button>
              </div>
            </div>
          )}

          <div className="relative">
            <Input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              disabled={isUploading}
            />
            <Button
              variant="outline"
              className="relative"
              disabled={isUploading}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              {isUploading
                ? "上传中..."
                : value.image
                ? "更换封面"
                : "上传封面"}
            </Button>
          </div>
        </div>
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
        <Button onClick={() => mutate()} disabled={isUpdating || isUploading}>
          {isUpdating ? "保存中..." : "Save"}
        </Button>

        <Button variant="outline" onClick={handleCopy}>
          Copy
        </Button>
      </div>
    </div>
  );
}
