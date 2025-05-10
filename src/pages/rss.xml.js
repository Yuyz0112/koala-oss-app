import RSS from 'rss'
import { client } from "../data/db";

const feed = new RSS({
  title: "Koala 聊开源",
  description: "Koala 聊开源近期视频",
  feed_url: "https://koala-oss.app/rss.xml",
  site_url: "https://koala-oss.app/",
  language: "zh-cn",
});

export const GET = async () => {
  const { data } = await client
    .from("news")
    .select("id, title, image")
    .filter("draft", "eq", false).order("created_at", {
      ascending: false,
    })

  for (const item of data) {
    feed.item({
      title: item.title,
      url: `https://koala-oss.app/news/${item.id}`,
      description: `<div><img src="https://r2.koala-oss.app/${item.image}" alt="${item.title}" /></div>`,
    })
  }

  const xml = feed.xml({ indent: true });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};