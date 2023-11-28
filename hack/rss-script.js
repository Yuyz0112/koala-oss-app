const RSS = require("rss");
const data = require("../assets/data.json");
const fs = require("fs");
const path = require("path");

function generateFeed() {
  const feed = new RSS({
    title: "Koala 聊开源",
    description: "Koala 聊开源近期视频",
    feed_url: "https://koala-oss.app/rss.xml",
    site_url: "https://koala-oss.app/",
    language: "zh-cn",
  });

  const newsData = data.slice(0, 4);

  newsData.forEach((item) => {
    item.hn_items.introduces.forEach((intro, index) => {
      const link = item.hn_items.links[index];
      const linkArr = Array.isArray(link) ? link : [link];
      const t = item.hn_items.times[index];
      const time = t.minutes * 60 + t.seconds - 0.1;
      const videoUrl = `https://www.bilibili.com/video/${item.bid}?t=${time}`;
      feed.item({
        guid: `${item.bid}-${index}`,
        date: new Date().toISOString(),
        title: intro,
        url: linkArr[0],
        description: `
          <![CDATA[
            <p><a href="${videoUrl}">视频链接</a></p>
          ]]>
        `,
      });
    });
  });

  const xml = feed.xml({ indent: true });
  return xml;
}

fs.writeFileSync(path.resolve(__dirname, "../assets/rss.xml"), generateFeed());
