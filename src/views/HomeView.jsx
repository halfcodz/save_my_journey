import { useMemo, useState } from "react";
import { SearchIcon } from "../components/Icons.jsx";
import { describeMedia, formatDateRange, formatLongDate, padOrder } from "../hooks.js";

/**
 * 홈 — the user's recorded journeys at a glance. 여행 기록 remains the full
 * library, while this screen makes completed and in-progress memories readable.
 */
export default function HomeView({
  activeTrip,
  trips,
  stats,
  tripCoverUrls,
  placesByTrip,
  mediaByPlace,
  mediaUrls,
  onOpenPlace,
  onOpenTrip,
  onStartTrip,
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const tripById = useMemo(() => Object.fromEntries(trips.map((trip) => [trip.id, trip])), [trips]);
  const allPlaces = useMemo(() => {
    const indexed = Object.entries(placesByTrip || {}).flatMap(([tripId, items]) =>
      items.map((place) => ({
        ...place,
        tripId,
        tripTitle: tripById[tripId]?.title || "",
        tripDate: tripById[tripId]?.startedAt || tripById[tripId]?.createdAt || place.visitedAt,
      }))
    );
    return indexed.sort((a, b) => {
      const dateSort = new Date(b.visitedAt || b.tripDate || 0) - new Date(a.visitedAt || a.tripDate || 0);
      return dateSort || (b.order || 0) - (a.order || 0);
    });
  }, [placesByTrip, tripById]);
  const visibleTrips = useMemo(
    () =>
      trips.filter(
        (trip) =>
          !term ||
          `${trip.title} ${formatDateRange(trip.startedAt || trip.createdAt, trip.endedAt)}`.toLowerCase().includes(term)
      ),
    [trips, term]
  );
  const visiblePlaces = useMemo(
    () =>
      allPlaces.filter(
        (place) =>
          !term || `${place.name} ${place.note || ""} ${place.tripTitle}`.toLowerCase().includes(term)
      ),
    [allPlaces, term]
  );
  const recentTrips = visibleTrips.slice(0, 4);
  const latestTrip = visibleTrips[0] || null;
  const latestCoverUrl = latestTrip ? tripCoverUrls[latestTrip.id] : "";

  return (
    <section className="screen">
      <div className="screen-head">
        <div className="head-stack">
          <span className="eyebrow">{formatLongDate()}</span>
          <h1 className="screen-title">내 여행 기록</h1>
        </div>
        {trips.length ? (
          <button
            type="button"
            className="head-icon"
            aria-label="여행 기록 검색"
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
            placeholder="여행, 장소, 메모 검색"
            aria-label="여행 기록 검색"
            autoFocus
          />
        </div>
      ) : null}

      <div className="scroll with-tabs">
        {trips.length && !term ? (
          <div className="home-overview">
            <div className="home-stat-strip" aria-label="여행 기록 요약">
              <div>
                <strong>{stats.trips}</strong>
                <span>여행</span>
              </div>
              <div>
                <strong>{stats.places}</strong>
                <span>장소</span>
              </div>
              <div>
                <strong>{stats.photos + stats.videos}</strong>
                <span>미디어</span>
              </div>
            </div>

            {latestTrip ? (
              <button type="button" className="memory-hero" onClick={() => onOpenTrip(latestTrip.id)}>
                <span className="memory-cover thumb">
                  {latestCoverUrl ? <img src={latestCoverUrl} alt="" /> : <span className="ph">JOURNEY</span>}
                </span>
                <span className="memory-copy">
                  <span className="memory-state">{latestTrip.status === "complete" ? "최근 완료한 여행" : "기록 중인 여행"}</span>
                  <strong>{latestTrip.title}</strong>
                  <span>
                    {formatDateRange(latestTrip.startedAt || latestTrip.createdAt, latestTrip.endedAt)} ·{" "}
                    {latestTrip.placeCount ?? 0}곳
                  </span>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        {visiblePlaces.length ? (
          <section className="home-section" aria-labelledby="home-active-title">
            <div className="home-section-head">
              <h2 id="home-active-title">{term ? "장소 결과" : "최근 장소"}</h2>
              {activeTrip ? (
                <button type="button" onClick={() => onOpenTrip(activeTrip.id)}>
                  지도
                </button>
              ) : null}
            </div>
            <div className="home-place-strip">
              {visiblePlaces.slice(0, 5).map((place) => {
                const media = activeTrip?.id === place.tripId ? mediaByPlace[place.id] || [] : [];
                const cover = media.find((item) => item.type === "image") || media[0];
                const summary = describeMedia(media);
                const tripCoverUrl = tripCoverUrls[place.tripId];

                return (
                  <button
                    key={place.id}
                    type="button"
                    className="home-place"
                    onClick={() => onOpenPlace(place.tripId, place.id)}
                  >
                    <span className="home-place-order">{padOrder(place.order)}</span>
                    <span className="home-place-thumb thumb">
                      {cover && mediaUrls[cover.id] ? (
                        cover.type === "video" ? (
                          <video src={mediaUrls[cover.id]} muted playsInline preload="metadata" />
                        ) : (
                          <img src={mediaUrls[cover.id]} alt="" />
                        )
                      ) : tripCoverUrl ? (
                        <img src={tripCoverUrl} alt="" />
                      ) : (
                        <span className="ph">PIN</span>
                      )}
                    </span>
                    <span className="home-place-copy">
                      <strong>{place.name}</strong>
                      <span>{place.note || summary || place.tripTitle || "기록 확인"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {recentTrips.length ? (
          <section className="home-section" aria-labelledby="home-recent-title">
            <div className="home-section-head">
              <h2 id="home-recent-title">{term ? "검색 결과" : "최근 여행"}</h2>
              <span>{visibleTrips.length}개</span>
            </div>
            <div className="home-trip-list">
              {recentTrips.map((trip) => (
                <button key={trip.id} type="button" className="home-trip-row" onClick={() => onOpenTrip(trip.id)}>
                  <span className={`home-trip-thumb thumb${tripCoverUrls[trip.id] ? "" : " alt"}`}>
                    {tripCoverUrls[trip.id] ? <img src={tripCoverUrls[trip.id]} alt="" /> : null}
                  </span>
                  <span className="home-trip-copy">
                    <strong>{trip.title}</strong>
                    <span>
                      {formatDateRange(trip.startedAt || trip.createdAt, trip.endedAt)} · {trip.placeCount ?? 0}곳
                    </span>
                  </span>
                  <span className="home-trip-status">{trip.status === "complete" ? "완료" : "진행"}</span>
                </button>
              ))}
            </div>
          </section>
        ) : !visiblePlaces.length ? (
          <div className="empty">
            <h2>
              {term
                ? "찾는 여행 기록이 없어요."
                : activeTrip
                  ? "아직 홈에 보여줄 장소가 없어요."
                  : "아직 기록한 여행이 없어요."}
            </h2>
            <p>
              {term
                ? "다른 말로 검색해 보세요."
                : activeTrip
                  ? "가운데 ＋ 를 눌러 첫 장소를 남겨 보세요."
                  : "여행을 시작하면 날짜, 장소, 사진이 홈에 정리됩니다."}
            </p>
            {!activeTrip && !term ? (
              <button className="pill solid" type="button" onClick={onStartTrip}>
                새 여행 시작
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
