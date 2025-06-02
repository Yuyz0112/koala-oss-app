import { useEffect, useState } from "preact/hooks";
import { createNewsBuilder } from "../data/db";

export default function NewsList({ initData, grid }) {
  const [keyword, setKeyword] = useState("");

  const [result, setResult] = useState({
    loading: false,
    data: initData,
  });

  const data = result.data;

  const loadMore = async () => {
    setResult({ ...result, loading: true });

    const builder = createNewsBuilder();
    if (keyword) {
      builder.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
    }

    const newResult = await builder
      .range(data.length, data.length + 11)
      .order("created_at", { ascending: false });

    setResult({ loading: false, data: [...data, ...newResult.data] });
  };

  useEffect(() => {
    const fetchData = async () => {
      setResult({ ...result, loading: true });

      const newResult = await createNewsBuilder()
        .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
        .order("created_at", { ascending: false })
        .limit(12);

      setResult({ loading: false, data: newResult.data });
    };

    if (keyword) {
      fetchData();
    } else {
      setResult({ loading: false, data: initData });
    }
  }, [keyword]);

  return (
    <>
      <header class="title-header title-header--initial">
        <div class="search-wrapper">
          <div class="search-wrapper">
            <input
              class="search-control"
              name="q"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search..."
            />
            <button class="search-control" type="button">
              Search
            </button>
          </div>
          <div></div>
        </div>
      </header>

      <hr />

      <section class="data-grid" id="grid" data-grid={grid}>
        {data.map((item) => {
          if (grid === "news") {
            return (
              <a class="news-card" href={`/news/${item.id}`}>
                <img
                  src={`https://r2.koala-oss.app/${item.image}`}
                  alt={item.title}
                />
                <div class="title">{item.title}</div>
              </a>
            );
          }

          return null;
        })}
      </section>

      <button
        className="load-more-btn"
        disabled={result.loading}
        onClick={loadMore}
      >
        {result.loading ? "Loading..." : "加载更多"}
      </button>
    </>
  );
}
