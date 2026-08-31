import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import PullToRefresh from "../components/PullToRefresh.jsx";
import { AddButton } from "../components/TabBar.jsx";
import { formatDotDate } from "../hooks.js";
import { TRIP_KINDS, tripKind } from "../tripKinds.js";

const LONG_PRESS_MS = 460;

/**
 * 나만의 여행 코스 — the library. A tap plays the course back; a long press
 * opens the edit/delete sheet, the way a photo grid behaves.
 */
export default function RecordsView({
  trips,
  tripCoverUrls,
  onPlayTrip,
  onEditTrip,
  onDeleteTrip,
  onPickCover,
  onCreateTrip,
  onRefresh,
}) {
  const [composer, setComposer] = useState(null); // { id?, title, kind }
  const [menuTrip, setMenuTrip] = useState(null);
  const pressRef = useRef(null);

  const feature = trips.find((trip) => trip.status !== "complete") || trips[0] || null;
  const rest = trips.filter((trip) => trip.id !== feature?.id);

  const startPress = (trip) => (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const timer = setTimeout(() => {
      pressRef.current = { ...pressRef.current, fired: true };
      setMenuTrip(trip);
      navigator.vibrate?.(8);
    }, LONG_PRESS_MS);
    pressRef.current = { timer, x: event.clientX, y: event.clientY, fired: false };
  };

  const movePress = (event) => {
    const press = pressRef.current;
    if (!press || press.fired) return;
    if (Math.abs(event.clientX - press.x) > 8 || Math.abs(event.clientY - press.y) > 8) {
      clearTimeout(press.timer);
      pressRef.current = null;
    }
  };

  const endPress = (trip) => () => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;
    clearTimeout(press.timer);
    if (!press.fired) onPlayTrip(trip.id);
  };

  const cancelPress = () => {
    if (pressRef.current) clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  };

  const pressProps = (trip) => ({
    onPointerDown: startPress(trip),
    onPointerMove: movePress,
    onPointerUp: endPress(trip),
    onPointerCancel: cancelPress,
    onContextMenu: (event) => event.preventDefault(),
  });

  const submitComposer = async (event) => {
    event.preventDefault();
    await onCreateTrip(composer.title, composer.kind, composer.id);
    setComposer(null);
  };

  return (
    <section className="screen">
      <div className="screen-head">
        <h1 className="screen-title">나만의 여행 코스</h1>
      </div>

      <PullToRefresh className="scroll with-tabs" onRefresh={onRefresh}>
        {composer ? (
          <form className="panel" onSubmit={submitComposer} data-no-swipe>
            <label className="field underline">
              <span>{composer.id ? "코스 이름" : "새 코스 이름"}</span>
              <input
                value={composer.title}
                onChange={(event) => setComposer((c) => ({ ...c, title: event.target.value }))}
                placeholder="예: 성수 한 바퀴"
                autoFocus
              />
            </label>
            <div className="field">
              <span>어떤 코스인가요</span>
              <div className="day-chips" role="group" aria-label="코스 종류">
                {TRIP_KINDS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chip"
                    aria-pressed={composer.kind === item.id}
                    onClick={() => setComposer((c) => ({ ...c, kind: item.id }))}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="pill solid compact" type="submit">
              {composer.id ? "저장" : "만들기"}
            </button>
            <button className="link-underline" type="button" onClick={() => setComposer(null)}>
              취소
            </button>
          </form>
        ) : null}

        {feature ? (
          <div className="trip-feature" {...pressProps(feature)} role="button" tabIndex={0}>
            <span className="trip-feature-cover">
              {tripCoverUrls[feature.id] ? <img src={tripCoverUrls[feature.id]} alt="" /> : null}
              <span className="badge">{feature.status === "complete" ? "기록 완료" : "기록 중"}</span>
            </span>
            <span className="trip-feature-line">
              <span className="trip-feature-name">{feature.title}</span>
              <span className="trip-feature-count">{feature.dayCount ?? 0}일차까지</span>
            </span>
            <span className="eyebrow trip-feature-date">
              <span className={`kind-tag kind-${feature.kind || "travel"}`}>{tripKind(feature.kind).short}</span>
              {formatDotDate(feature.startedAt || feature.createdAt)}
            </span>
          </div>
        ) : null}

        {rest.length ? (
          <div className="row-list">
            {rest.map((trip) => (
              <div key={trip.id} className="row" {...pressProps(trip)} role="button" tabIndex={0}>
                <span className={`row-thumb thumb${tripCoverUrls[trip.id] ? "" : " alt"}`}>
                  {tripCoverUrls[trip.id] ? <img src={tripCoverUrls[trip.id]} alt="" loading="lazy" /> : null}
                </span>
                <span className="row-copy">
                  <strong>{trip.title}</strong>
                  <span>
                    <span className={`kind-tag kind-${trip.kind || "travel"}`}>{tripKind(trip.kind).short}</span>
                    {formatDotDate(trip.startedAt || trip.createdAt)} · {trip.dayCount ?? 0}일차까지
                  </span>
                </span>
                <span className="row-chevron" aria-hidden="true">
                  ›
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {!trips.length && !composer ? (
          <div className="empty">
            <span className="eyebrow">나만의 여행 코스</span>
            <h2>첫 코스를 만들어 보세요.</h2>
            <p>＋ 를 누르면 코스를 만들고 다녀온 곳을 날짜별로 남길 수 있습니다.</p>
          </div>
        ) : null}

      </PullToRefresh>

      {!composer ? (
        <AddButton onClick={() => setComposer({ title: "", kind: "travel" })} label="새 코스 만들기" />
      ) : null}

      {/* 페이저 트랙의 transform이 position:fixed의 기준을 가로채므로 body로 뺀다. */}
      {menuTrip
        ? createPortal(
            <>
          <div className="scrim" onClick={() => setMenuTrip(null)} role="presentation" />
          <div className="menu" role="dialog" aria-label={`${menuTrip.title} 메뉴`}>
            <div className="menu-grip" aria-hidden="true" />
            <p className="menu-title">{menuTrip.title}</p>
            <button
              type="button"
              onClick={() => {
                const trip = menuTrip;
                setMenuTrip(null);
                onEditTrip(trip.id);
              }}
            >
              코스 수정
            </button>
            <button
              type="button"
              onClick={() => {
                const trip = menuTrip;
                setMenuTrip(null);
                setComposer({ id: trip.id, title: trip.title, kind: trip.kind || "travel" });
              }}
            >
              이름 · 종류 바꾸기
            </button>
            <button
              type="button"
              onClick={() => {
                const trip = menuTrip;
                setMenuTrip(null);
                onPickCover(trip.id);
              }}
            >
              대표 사진 바꾸기
            </button>
            <button
              type="button"
              className="quiet"
              onClick={() => {
                const trip = menuTrip;
                setMenuTrip(null);
                onDeleteTrip(trip.id);
              }}
            >
              코스 삭제
            </button>
              <button type="button" className="quiet" onClick={() => setMenuTrip(null)}>
                닫기
              </button>
            </div>
            </>,
            document.body
          )
        : null}
    </section>
  );
}
