import { useState } from "react";
import PullToRefresh from "../components/PullToRefresh.jsx";
import { AddButton } from "../components/TabBar.jsx";
import { formatDotDate } from "../hooks.js";

/**
 * 나만의 여행 코스 — the trip library. The trip still being recorded takes a
 * full cover card; everything finished collapses to a thumbnail row.
 */
export default function RecordsView({ trips, tripCoverUrls, onOpenTrip, onCreateTrip, onRefresh }) {
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
        <h1 className="screen-title">나만의 여행 코스</h1>
      </div>

      <PullToRefresh className="scroll with-tabs" onRefresh={onRefresh}>
        {creating ? (
          <form className="panel" onSubmit={create} data-no-swipe>
            <label className="field underline">
              <span>새 여행 이름</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 성수 한 바퀴"
                autoFocus
              />
            </label>
            <button className="pill solid compact" type="submit">
              만들기
            </button>
            <button className="link-underline" type="button" onClick={() => setCreating(false)}>
              취소
            </button>
          </form>
        ) : null}

        {feature ? (
          <button type="button" className="trip-feature" onClick={() => onOpenTrip(feature.id)}>
            <span className="trip-feature-cover">
              {tripCoverUrls[feature.id] ? <img src={tripCoverUrls[feature.id]} alt="" /> : null}
              <span className="badge">{feature.status === "complete" ? "기록 완료" : "기록 중"}</span>
            </span>
            <span className="trip-feature-line">
              <span className="trip-feature-name">{feature.title}</span>
              <span className="trip-feature-count">{feature.placeCount ?? 0}차까지</span>
            </span>
            <span className="eyebrow trip-feature-date">
              {formatDotDate(feature.startedAt || feature.createdAt)}
            </span>
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
                    {formatDotDate(trip.startedAt || trip.createdAt)} · {trip.placeCount ?? 0}차까지
                  </span>
                </span>
                <span className="row-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {!trips.length && !creating ? (
          <div className="empty">
            <span className="eyebrow">나만의 여행 코스</span>
            <h2>첫 코스를 만들어 보세요.</h2>
            <p>＋ 를 누르면 여행을 만들고 다녀온 곳을 차례로 남길 수 있습니다.</p>
          </div>
        ) : null}
      </PullToRefresh>

      {!creating ? <AddButton onClick={() => setCreating(true)} label="새 여행 만들기" /> : null}
    </section>
  );
}
