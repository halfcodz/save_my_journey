import { useState } from "react";
import PullToRefresh from "../components/PullToRefresh.jsx";
import { SearchIcon } from "../components/Icons.jsx";
import { orderLabel } from "../hooks.js";

/**
 * 검색 — other people's courses, found by typing. v3 drops the category chips
 * and the save button; a course card is a cover, a title, its route, and who
 * walked it.
 */
export default function SearchView({ posts, onRefresh }) {
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const visible = posts.filter(
    (post) =>
      !term ||
      `${post.title} ${post.area} ${post.authorName} ${post.places.map((p) => p.name).join(" ")}`
        .toLowerCase()
        .includes(term)
  );

  return (
    <section className="screen">
      <div className="screen-head stack">
        <h1 className="screen-title">검색</h1>
        <label className="search-pill" data-no-swipe>
          <SearchIcon width={17} height={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="연남동 데이트"
            aria-label="코스 검색"
          />
        </label>
      </div>

      <PullToRefresh className="scroll with-tabs" onRefresh={onRefresh}>
        {visible.length ? (
          <div className="course-stack">
            {visible.map((post) => {
              const steps = post.places.slice(0, 3);
              const extra = post.places.length - steps.length;

              return (
                <article key={post.id} className="course">
                  <div className="mosaic" aria-hidden="true">
                    <div className="thumb" />
                    <div>
                      <div className="thumb alt" />
                      <div className="thumb" />
                    </div>
                  </div>
                  <div className="course-copy">
                    <h2>{post.title}</h2>
                    <p className="course-steps">
                      {steps.map((place) => `${orderLabel(place.order)} ${place.name}`).join(" · ")}
                      {extra > 0 ? ` · +${extra}` : ""}
                    </p>
                    <p className="course-meta">
                      {post.authorName} · {post.duration} · ♡ {post.likes || 0}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <span className="eyebrow">검색</span>
            <h2>{term ? "찾는 코스가 없어요." : "아직 공개된 코스가 없어요."}</h2>
            <p>
              {term
                ? "다른 말로 검색해 보세요."
                : "여행을 마친 뒤 ⋯ 메뉴에서 공개하면 여기에 올라옵니다."}
            </p>
          </div>
        )}
      </PullToRefresh>
    </section>
  );
}
