import { client } from "./supabase/client";

export type News = {
  id: number;
  title: string;
  url: string;
  content: string;
  created_at: string;
  draft: boolean;
  tags: string[];
};

export const db = {
  async countNews({
    filter,
  }: {
    filter?: {
      draft?: boolean;
      titleOrContent?: string;
    };
  }): Promise<number> {
    const builder = client
      .from("news")
      .select("*", { count: "exact" })
      .limit(0);

    if (filter?.draft !== undefined) {
      builder.eq("draft", filter.draft);
    }

    if (filter?.titleOrContent) {
      builder.or(
        `title.ilike.%${filter.titleOrContent}%,content.ilike.%${filter.titleOrContent}%`
      );
    }

    const { count } = await builder;
    return count || 0;
  },
  async listNews({
    limit,
    offset = 0,
    filter,
  }: {
    limit?: number;
    offset?: number;
    filter?: {
      draft?: boolean;
      titleOrContent?: string;
    };
  }): Promise<News[]> {
    const builder = client
      .from("news")
      .select()
      .order("created_at", { ascending: false });

    if (limit) {
      builder.range(offset, offset + limit - 1);
    }

    if (filter?.draft !== undefined) {
      builder.eq("draft", filter.draft);
    }

    if (filter?.titleOrContent) {
      builder.or(
        `title.ilike.%${filter.titleOrContent}%,content.ilike.%${filter.titleOrContent}%`
      );
    }

    const { data } = await builder;
    return data || [];
  },
  async getNews(id: number): Promise<News | null> {
    const { data } = await client.from("news").select().eq("id", id).single();
    return data || null;
  },
  async updateNews(news: News): Promise<News> {
    const { data } = await client
      .from("news")
      .update(news)
      .eq("id", news.id)
      .select()
      .single();
    return data;
  },
  async deleteNews(id: number): Promise<void> {
    await client.from("news").delete().eq("id", id);
  },
};
