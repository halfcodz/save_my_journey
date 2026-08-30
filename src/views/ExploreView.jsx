import { useMemo, useState } from "react";
import { padOrder } from "../hooks.js";

const ALL = "전체";

/**
 * 탐색 — other people's courses. Covers are a 2:1 mosaic, the route is one
 * compressed line of numbered stops, and 담기 is the only filled control.
 */
export default function ExploreView({ posts, savedIds, likedIds, onToggleSave, onToggleLike }) {
  const [filter, setFilter] = useState(ALL);

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(posts.map((post) => post.category).filter(Boolean)))],
    [posts]
  );

  const visible = posts.filter((post) => filter === ALL || post.category === filter);

  return (
    <section className="screen">
      <div className="screen-head">
        <h1 className="screen-title">탐색</h1>
      </div>

      <div className="chip-row" role="group" aria-label="코스 분류">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className="chip"
            aria-pressed={filter === category}
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="scroll with-tabs">
        {visible.length ? (
          <div className="explore-stack">
            {visible.map((post) => {
              const liked = likedIds.includes(post.id);
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
                    <div className="course-stats">
                      <button
                        type="button"
                        aria-pressed={liked}
                        aria-label={liked ? "좋아요 취소" : "좋아요"}
                        onClick={() => onToggleLike(post.id)}
                      >
                        {liked ? "♥" : "♡"} {(post.likes || 0) + (liked ? 1 : 0)}
                      </button>
                      <span>저장 {(post.saves || 0) + (saved ? 1 : 0)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <span className="eyebrow">탐색</span>
            <h2>이 분류에는 코스가 없어요.</h2>
            <p>다른 분류를 골라 보세요.</p>
          </div>
        )}
      </div>
    </section>
  );
}
