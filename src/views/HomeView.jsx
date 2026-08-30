import { useMemo, useState } from "react";
import { SearchIcon } from "../components/Icons.jsx";
import { describeMedia, formatClock, formatLongDate, padOrder } from "../hooks.js";

/**
 * 오늘의 코스 — only the trip in progress. Past trips live in 내 여행 and saved
 * courses live in 탐색, so this screen carries one idea and nothing else.
 */
export default function HomeView({
  activeTrip,
  places,
  mediaByPlace,
  mediaUrls,
  onOpenPlace,
  onOpenTrip,
  onStartTrip,
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const visiblePlaces = useMemo(
    () =>
      places.filter(
        (place) => !term || `${place.name} ${place.note || ""}`.toLowerCase().includes(term)
      ),
    [places, term]
  );

  return (
    <section className="screen">
      <div className="screen-head">
        <div className="head-stack">
          <span className="eyebrow">{formatLongDate()}</span>
          <h1 className="screen-title">오늘의 코스</h1>
        </div>
        {places.length ? (
          <button
            type="button"
            className="head-icon"
            aria-label="기록 검색"
            aria-expanded={searching}
            onClick={() => {
              setSearching((current) => !current);
              setQuery("");
            }}
          >
            <SearchIcon width={20} height={20} strokeWidth={1.6} />
          </button>
        ) : null}
      </div>

      {searching ? (
        <div className="search-line">
          <SearchIcon width={18} height={18} strokeWidth={1.6} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="장소, 메모 검색"
            aria-label="기록 검색"
            autoFocus
          />
        </div>
      ) : null}

      <div className="scroll with-tabs">
        {activeTrip && visiblePlaces.length ? (
          <div className="timeline">
            {visiblePlaces.map((place) => {
              const media = mediaByPlace[place.id] || [];
              const cover = media.find((item) => item.type === "image") || media[0];
              const summary = describeMedia(media);

              return (
                <button
                  key={place.id}
                  type="button"
                  className="tl-item"
                  onClick={() => onOpenPlace(activeTrip.id, place.id)}
                >
                  <span className="tl-rail">
                    <span className="tl-time">{formatClock(place.visitedAt)}</span>
                    <span className="tl-order">{padOrder(place.order)}</span>
                    <span className="tl-thread" />
                  </span>
                  <span className="tl-body">
                    <span className="tl-cover thumb">
                      {cover && mediaUrls[cover.id] ? (
                        cover.type === "video" ? (
                          <video src={mediaUrls[cover.id]} muted playsInline preload="metadata" />
                        ) : (
                          <img src={mediaUrls[cover.id]} alt="" />
                        )
                      ) : (
                        <span className="ph">PHOTO — {place.name}</span>
                      )}
                    </span>
                    <span className="tl-copy">
                      <span className="tl-name">{place.name}</span>
                      {place.note ? <span className="tl-note">{place.note}</span> : null}
                      {summary ? <span className="eyebrow">{summary}</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}

            <div className="screen-cta">
              <button className="pill ghost compact" type="button" onClick={() => onOpenTrip(activeTrip.id)}>
                지도에서 보기
              </button>
            </div>
          </div>
        ) : (
          <div className="empty">
            <span className="eyebrow">{activeTrip ? activeTrip.title : "진행 중"}</span>
            <h2>
              {term
                ? "찾는 기록이 없어요."
                : activeTrip
                  ? "아직 기록한 장소가 없어요."
                  : "진행 중인 여행이 없어요."}
            </h2>
            <p>
              {term
                ? "다른 말로 검색해 보세요."
                : activeTrip
                  ? "가운데 ＋ 를 눌러 첫 장소를 남겨 보세요."
                  : "새 여행을 시작하면 오늘의 코스가 여기에 쌓입니다."}
            </p>
            {!activeTrip && !term ? (
              <button className="pill solid" type="button" onClick={onStartTrip}>
                새 여행 시작
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
