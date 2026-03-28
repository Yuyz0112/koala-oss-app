import { useEffect, useState } from "preact/hooks";
import { createNewsBuilder, client } from "../data/db";

export default function NewsList({ initData, grid }) {
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [copying, setCopying] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const [result, setResult] = useState({
    loading: false,
    data: initData,
  });

  const data = result.data;

  const toggleSelect = (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    if (selected.size === 0) return;
    setCopying(true);
    try {
      const { data: items } = await client
        .from("news")
        .select("id, title, content")
        .in("id", [...selected]);

      const orderedItems = [...selected]
        .map((id) => items.find((it) => it.id === id))
        .filter(Boolean);

      const text = orderedItems.map((it) => it.content).join("\n\n");
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } finally {
      setCopying(false);
    }
  };

  const clearSelection = () => setSelected(new Set());

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
            const isSelected = selected.has(item.id);
            return (
              <div
                class={`news-card ${isSelected ? "news-card--selected" : ""}`}
                onClick={(e) => toggleSelect(item.id, e)}
                style={{ cursor: "pointer" }}
              >
                {isSelected && (
                  <div class="news-card-check">✓</div>
                )}
                <img
                  src={`https://r2.koala-oss.app/${item.image}`}
                  alt={item.title}
                  style={{
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                />
                <div class="title">{item.title}</div>
              </div>
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

      {selected.size > 0 && (
        <div class="batch-bar">
          <span class="batch-bar-count">
            已选 {selected.size} 项
          </span>
          <div class="batch-bar-actions">
            <button class="batch-bar-btn" onClick={clearSelection}>
              取消
            </button>
            <button
              class="batch-bar-btn batch-bar-btn--primary"
              onClick={handleCopy}
              disabled={copying}
            >
              {copyDone ? "已复制!" : copying ? "复制中..." : "复制文案"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
