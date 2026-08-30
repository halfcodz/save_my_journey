import { useMemo, useState } from "react";
import { SearchIcon } from "../components/Icons.jsx";
import { describeMedia, formatClock, formatDotDate, formatLongDate, padOrder } from "../hooks.js";

const TABS = [
  { id: "active", label: "진행 중" },
  { id: "past", label: "지난 여행" },
  { id: "saved", label: "저장함" },
];

/**
 * 오늘의 코스 — the in-progress trip as a vertical time rail. Photos lead, the
 * time and order sit on a thin left rail, and everything else is quiet.
 */
export default function HomeView({
  activeTrip,
  places,
  mediaByPlace,
  mediaUrls,
  pastTrips,
  tripCoverUrls,
  savedPosts,
  onOpenPlace,
  onOpenTrip,
  onOpenReels,
  onStartTrip,
}) {
  const [tab, setTab] = useState("active");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const matches = (...parts) => !term || parts.filter(Boolean).join(" ").toLowerCase().includes(term);

  const visiblePlaces = useMemo(
    () => places.filter((place) => matches(place.name, place.note)),
    [places, term]
  );
  const visiblePast = useMemo(() => pastTrips.filter((trip) => matches(trip.title)), [pastTrips, term]);
  const visibleSaved = useMemo(
    () => savedPosts.filter((post) => matches(post.title, post.area, post.category)),
    [savedPosts, term]
  );

  return (
    <section className="screen">
      <div className="screen-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span className="eyebrow">{formatLongDate()}</span>
          <h1 className="screen-title">오늘의 코스</h1>
        </div>
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
      </div>

      {searching ? (
        <div className="search-line">
          <SearchIcon width={18} height={18} strokeWidth={1.6} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="장소, 여행, 저장한 코스 검색"
            aria-label="기록 검색"
            autoFocus
          />
        </div>
      ) : null}

      <div className="seg-tabs" role="tablist" aria-label="기록 보기">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="scroll with-tabs">
        {tab === "active" ? (
          activeTrip && visiblePlaces.length ? (
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
                        <span className="eyebrow">{summary || "미디어 없음"}</span>
                      </span>
                    </span>
                  </button>
                );
              })}

              <div className="new-trip-cta">
                <button className="pill ghost compact" type="button" onClick={() => onOpenTrip(activeTrip.id)}>
                  지도에서 보기
                </button>
                <button className="pill solid compact" type="button" onClick={onOpenReels}>
                  릴스로 돌아보기
                </button>
              </div>
            </div>
          ) : (
            <div className="empty">
              <span className="eyebrow">진행 중</span>
              <h2>{activeTrip ? "아직 기록한 장소가 없어요." : "진행 중인 여행이 없어요."}</h2>
              <p>
                {activeTrip
                  ? "가운데 ＋ 를 눌러 첫 장소를 남겨 보세요."
                  : "새 여행을 시작하면 오늘의 코스가 여기에 쌓입니다."}
              </p>
              {!activeTrip ? (
                <button className="pill solid" type="button" onClick={onStartTrip}>
                  새 여행 시작
                </button>
              ) : null}
            </div>
          )
        ) : null}

        {tab === "past" ? (
          visiblePast.length ? (
            <div className="row-list">
              {visiblePast.map((trip) => (
                <button key={trip.id} type="button" className="row" onClick={() => onOpenTrip(trip.id)}>
                  <span className={`row-thumb thumb${tripCoverUrls[trip.id] ? "" : " alt"}`}>
                    {tripCoverUrls[trip.id] ? <img src={tripCoverUrls[trip.id]} alt="" /> : null}
                  </span>
                  <span className="row-copy">
                    <strong>{trip.title}</strong>
                    <span>
                      {formatDotDate(trip.endedAt || trip.updatedAt)} · {trip.placeCount ?? 0}곳
                    </span>
                  </span>
                  <span className="row-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">
              <span className="eyebrow">지난 여행</span>
              <h2>완료한 여행이 없어요.</h2>
              <p>여행 상세의 ⋯ 메뉴에서 여행을 완료로 표시할 수 있습니다.</p>
            </div>
          )
        ) : null}

        {tab === "saved" ? (
          visibleSaved.length ? (
            <div className="row-list">
              {visibleSaved.map((post) => (
                <div key={post.id} className="row">
                  <span className="row-thumb thumb alt" />
                  <span className="row-copy">
                    <strong>{post.title}</strong>
                    <span>
                      @{post.authorName} · {post.area} · {post.places.length}곳
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <span className="eyebrow">저장함</span>
              <h2>담아 둔 코스가 없어요.</h2>
              <p>탐색에서 마음에 드는 코스를 담기 하면 여기에 모입니다.</p>
            </div>
          )
        ) : null}
      </div>
    </section>
  );
}
