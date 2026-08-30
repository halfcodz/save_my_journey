import { useMemo, useState } from "react";
import { padOrder } from "../hooks.js";

const ALL = "전체";
const SAVED = "담은 코스";

/**
 * 탐색 — other people's courses. 담기 is the single action; the saved set is a
 * filter here rather than a separate screen elsewhere.
 */
export default function ExploreView({ posts, savedIds, onToggleSave }) {
  const [filter, setFilter] = useState(ALL);

  const chips = useMemo(() => {
    const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean)));
    return [ALL, ...categories, ...(savedIds.length ? [SAVED] : [])];
  }, [posts, savedIds.length]);

  const visible = posts.filter((post) => {
    if (filter === ALL) return true;
    if (filter === SAVED) return savedIds.includes(post.id);
    return post.category === filter;
  });

  return (
    <section className="screen">
      <div className="screen-head">
        <h1 className="screen-title">탐색</h1>
      </div>

      <div className="chip-row" role="group" aria-label="코스 분류">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="chip"
            aria-pressed={filter === chip}
            onClick={() => setFilter(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="scroll with-tabs">
        {visible.length ? (
          <div className="explore-stack">
            {visible.map((post) => {
              const saved = savedIds.includes(post.id);
              const steps = post.places.slice(0, 3);
              const extra = post.places.length - steps.length;

              return (
                <article key={post.id} className="course">
                  <div className="course-author">
                    <span className="avatar" aria-hidden="true">
                      {post.authorName.slice(0, 1)}
                    </span>
                    <div>
                      <strong>{post.authorName}</strong>
                      <span>
                        {post.area} · {post.places.length}곳 · {post.duration}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="save-btn"
                      aria-pressed={saved}
                      onClick={() => onToggleSave(post.id)}
                    >
                      {saved ? "담김" : "담기"}
                    </button>
                  </div>

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
                      {steps.map((place) => `${padOrder(place.order)} ${place.name}`).join(" · ")}
                      {extra > 0 ? ` · +${extra}` : ""}
                    </p>
                    <p className="course-stats">저장 {(post.saves || 0) + (saved ? 1 : 0)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <span className="eyebrow">탐색</span>
            <h2>{filter === SAVED ? "담아 둔 코스가 없어요." : "이 분류에는 코스가 없어요."}</h2>
            <p>{filter === SAVED ? "마음에 드는 코스를 담기 해 보세요." : "다른 분류를 골라 보세요."}</p>
          </div>
        )}
      </div>
    </section>
  );
}
