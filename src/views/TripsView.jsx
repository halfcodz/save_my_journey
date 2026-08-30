import { useState } from "react";
import { formatDateRange, formatDotDate } from "../hooks.js";

/**
 * 여행 기록 — the newest in-progress trip gets a full cover card, everything
 * older collapses into 64px thumbnail rows.
 */
export default function TripsView({ trips, stats, tripCoverUrls, onOpenTrip, onCreateTrip }) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const feature = trips.find((trip) => trip.status !== "complete") || trips[0] || null;
  const rest = trips.filter((trip) => trip.id !== feature?.id);

  const create = async (event) => {
    event.preventDefault();
    await onCreateTrip(title);
    setTitle("");
    setCreating(false);
  };

  return (
    <section className="screen">
      <div className="screen-head">
        <div className="head-stack">
          <h1 className="screen-title">여행 기록</h1>
          <span className="eyebrow">
            {stats.trips}개 여행 · {stats.places}개 핀
          </span>
        </div>
        <button className="new-trip-mini" type="button" onClick={() => setCreating(true)} disabled={creating}>
          ＋ 새 여행
        </button>
      </div>

      {creating ? (
        <form className="inline-create" onSubmit={create}>
          <label className="field underline">
            <span>새 여행 이름</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 성수 한 바퀴" autoFocus />
          </label>
          <div className="inline-create-actions">
            <button className="pill solid compact" type="submit">
              만들기
            </button>
            <button className="link-underline" type="button" onClick={() => setCreating(false)}>
              취소
            </button>
          </div>
        </form>
      ) : null}

      <div className="scroll with-tabs">
        {feature ? (
          <button type="button" className="trip-feature" onClick={() => onOpenTrip(feature.id)}>
            <span className="trip-feature-cover">
              {tripCoverUrls[feature.id] ? <img src={tripCoverUrls[feature.id]} alt="" /> : null}
              <span className="badge">{feature.status === "complete" ? "완료" : "진행 중"}</span>
            </span>
            <span className="trip-feature-line">
              <span className="trip-feature-name">{feature.title}</span>
              <span className="trip-feature-count">{feature.placeCount ?? 0}곳</span>
            </span>
            <span className="eyebrow trip-feature-date">{formatDotDate(feature.startedAt || feature.createdAt)}</span>
          </button>
        ) : null}

        {rest.length ? (
          <div className="row-list">
            {rest.map((trip) => (
              <button key={trip.id} type="button" className="row" onClick={() => onOpenTrip(trip.id)}>
                <span className={`row-thumb thumb${tripCoverUrls[trip.id] ? "" : " alt"}`}>
                  {tripCoverUrls[trip.id] ? <img src={tripCoverUrls[trip.id]} alt="" /> : null}
                </span>
                <span className="row-copy">
                  <strong>{trip.title}</strong>
                  <span>
                    {formatDateRange(trip.startedAt || trip.createdAt, trip.endedAt)} · {trip.placeCount ?? 0}곳
                  </span>
                </span>
                <span className="row-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {!trips.length ? (
          <div className="empty">
            <span className="eyebrow">여행 기록</span>
            <h2>첫 여행을 만들어 보세요.</h2>
            <p>여행을 만들면 방문한 장소를 순서대로 남길 수 있습니다.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
