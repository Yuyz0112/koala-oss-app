import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";
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
import NewsEditor from "./NewsEditor";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SIZE_PER_PAGE = 30;

export default function NewsList() {
  const [page, setPage] = useState(0);

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

  const [editId, setEditId] = useState(0);

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
        <DialogContent className="min-w-[80%] h-[80%]">
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
