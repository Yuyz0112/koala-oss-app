import { useMutation, useQuery } from "@tanstack/react-query";
import { db, type News } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import NewsEditor from "./NewsEditor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SIZE_PER_PAGE = 30;

export default function NewsList() {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Map<number, News>>(new Map());

  const [filter, setFilter] = useState({
    draft: true,
    titleOrContent: "",
  });

  const { data: newsCount } = useQuery({
    queryKey: ["news", "count", filter],
    queryFn: () =>
      db.countNews({
        filter,
      }),
  });

  const {
    isPending,
    error,
    data: newsData,
  } = useQuery({
    queryKey: ["news", page, filter],
    queryFn: () =>
      db.listNews({
        offset: page * SIZE_PER_PAGE,
        limit: SIZE_PER_PAGE,
        filter,
      }),
  });

  const { isPending: isTriggering, mutate: triggerBuild } = useMutation({
    mutationKey: ["trigger-build"],
    mutationFn: () => {
      return fetch(import.meta.env.VITE_TRIGGER_ENDPOINT, {
        method: "POST",
      });
    },
  });

  const [editId, setEditId] = useState(0);

  const toggleSelect = (item: News) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  };

  const handleBatchCopy = async () => {
    const items = [...selected.values()];
    const text = items
      .map((it) => [it.url, `> ${it.title}\n`, it.content].join("\n"))
      .join("\n---\n");
    await navigator.clipboard.writeText(text);
    toast.success(`已复制 ${items.length} 条文案`);
  };

  if (error) {
    return <p>{"An error has occurred: " + error.message}</p>;
  }

  const totalPage = Math.ceil((newsCount ?? 0) / SIZE_PER_PAGE);

  return (
    <div className="p-2 w-screen h-screen">
      <Dialog
        open={Boolean(editId)}
        onOpenChange={(open) => {
          if (!open) {
            setEditId(0);
          }
        }}
      >
        <DialogContent className="min-w-[80%] h-[80%] overflow-auto">
          <NewsEditor id={editId} />
        </DialogContent>
      </Dialog>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-start shadow p-2 space-x-4">
          <Input
            value={filter.titleOrContent}
            onChange={(evt) => {
              setFilter({ ...filter, titleOrContent: evt.target.value });
            }}
            placeholder="Search by title or content"
            className="w-[250px]"
          />
          <div className="space-x-2 flex items-center ">
            <Switch
              id="draft"
              checked={filter.draft}
              // onchange
              onCheckedChange={(checked) => {
                setFilter({ ...filter, draft: checked });
              }}
            />
            <Label htmlFor="draft">Draft</Label>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                已选 {selected.size} 项
              </span>
              <Button variant="outline" size="sm" onClick={handleBatchCopy}>
                复制文案
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Map())}
              >
                取消
              </Button>
            </div>
          )}
          <div className="flex-1 text-right">
            <Button
              variant="outline"
              onClick={() => triggerBuild()}
              disabled={isTriggering}
            >
              Trigger Deploy
            </Button>
          </div>
        </div>
        {isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        ) : (
          <Table className="w-full table-fixed flex-grow">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="w-[10%]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[30%]">URL</TableHead>
                <TableHead className="w-[10%]">Draft</TableHead>
                <TableHead className="w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newsData.map((item) => {
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {(() => {
                        const order = [...selected.keys()].indexOf(item.id);
                        return (
                          <button
                            onClick={() => toggleSelect(item)}
                            className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center cursor-pointer border ${
                              order >= 0
                                ? "bg-blue-500 text-white border-blue-500"
                                : "border-gray-300 text-gray-400 hover:border-gray-400"
                            }`}
                          >
                            {order >= 0 ? order + 1 : ""}
                          </button>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.title}</TableCell>
                    <TableCell className="w-[30%] overflow-hidden text-clip">
                      <a
                        href={item.url}
                        target="_blank"
                        className="text-blue-500"
                      >
                        {item.url}
                      </a>
                    </TableCell>
                    <TableCell>{item.draft ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditId(item.id);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Pagination className="py-2 flex items-center">
          <div className="text-md mr-4">Total: {newsCount} items</div>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(0, page - 1))}
                className={
                  page === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {Array.from({ length: totalPage })
              .slice(Math.max(0, page - 2), Math.min(totalPage, page + 3))
              .map((_, i) => {
                const pageIndex = i + Math.max(0, page - 2);
                return (
                  <PaginationItem key={pageIndex}>
                    <PaginationLink
                      onClick={() => setPage(pageIndex)}
                      isActive={page === pageIndex}
                      className="cursor-pointer"
                    >
                      {pageIndex + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
            {page > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPage - 1, page + 1))}
                className={
                  page >= totalPage - 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Toaster />
    </div>
  );
}
