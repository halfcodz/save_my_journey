import { useState } from "react";
import PullToRefresh from "../components/PullToRefresh.jsx";
import { SearchIcon } from "../components/Icons.jsx";
import { dayLabel } from "../hooks.js";
import { tripKind } from "../tripKinds.js";

/**
 * 검색 — courses people published. A card opens the course itself; when the
 * course came from this device the real photos show, otherwise the route does.
 */
export default function SearchView({ posts, postCoverUrls = {}, onOpenPost, onRefresh }) {
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
            enterKeyHint="search"
          />
        </label>
      </div>

      <PullToRefresh className="scroll with-tabs" onRefresh={onRefresh}>
        {visible.length ? (
          <div className="course-stack">
            {visible.map((post) => {
              const steps = post.places.slice(0, 3);
              const extra = post.places.length - steps.length;
              const cover = postCoverUrls[post.id];
              const days = Math.max(1, ...post.places.map((p) => p.day || 1));

              return (
                <button key={post.id} type="button" className="course" onClick={() => onOpenPost(post)}>
                  <span className={`course-cover thumb${cover ? "" : " alt"}`}>
                    {cover ? <img src={cover} alt="" loading="lazy" /> : <span className="ph">사진 없음</span>}
                  </span>
                  <span className="course-copy">
                    <span className="course-title">{post.title}</span>
                    <span className="course-steps">
                      {steps.map((place) => `${dayLabel(place.day || 1)} ${place.name}`).join(" · ")}
                      {extra > 0 ? ` · +${extra}` : ""}
                    </span>
                    <span className="course-meta">
                      <span className={`kind-tag kind-${post.kind || "travel"}`}>{tripKind(post.kind).short}</span>
                      {post.authorName} · {days}일 · {post.places.length}곳
                    </span>
                  </span>
                </button>
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
                : "코스를 길게 눌러 수정 화면에 들어간 뒤 ⋯ 메뉴에서 공개할 수 있어요."}
            </p>
          </div>
        )}
      </PullToRefresh>
    </section>
  );
}
