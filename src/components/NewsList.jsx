import { useEffect, useRef, useState } from "preact/hooks";

export default function NewsList({ data, grid }) {
  const [keyword, setKeyword] = useState("");

  const lazyLoad = useRef(null);

  useEffect(() => {
    if (!lazyLoad.current) {
      lazyLoad.current = new window.LazyLoad({});
    } else {
      lazyLoad.current.update();
    }
  }, [data, keyword]);

  const filteredData = data.filter((item) => {
    if (!keyword) return true;
    return item.title.toLowerCase().includes(keyword.toLowerCase());
  });

  const total = filteredData.length;

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
          <div>Total: {total}</div>
        </div>
      </header>

      <hr />

      <section class="data-grid" id="grid" data-grid={grid}>
        {filteredData.map((item) => {
          if (grid === "news") {
            return (
              <a class="news-card" href={`/news/${item.id}`}>
                <img
                  class="lazy"
                  data-src={`https://r2.koala-oss.app/${item.image}`}
                  alt={item.title}
                />
                <div class="title">{item.title}</div>
              </a>
            );
          }

          return null;
        })}
      </section>
    </>
  );
}
