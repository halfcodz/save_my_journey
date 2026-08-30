import { useRef, useState } from "react";
import RouteMap from "../components/RouteMap.jsx";
import { BackIcon } from "../components/Icons.jsx";
import { describeMedia, formatClock, padOrder } from "../hooks.js";

/**
 * The map screen. Route fills the frame, controls float on top of it, and the
 * visit order lives in a sheet that can be pulled up over the map.
 */
export default function TripDetailView({
  trip,
  places,
  mediaByPlace,
  mediaUrls,
  selectedPlaceId,
  onSelectPlace,
  onBack,
  onReorder,
  onAddPlace,
  onEditPlace,
  onComplete,
  onPublish,
  onOpenReels,
  onDeleteTrip,
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dragRef = useRef(null);

  const startGrip = (event) => {
    dragRef.current = { y: event.clientY, expanded };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const endGrip = (event) => {
    const start = dragRef.current;
    dragRef.current = null;
    if (!start) return;
    const delta = event.clientY - start.y;
    if (delta < -40) setExpanded(true);
    else if (delta > 40) setExpanded(false);
    else setExpanded((current) => !current);
  };

  const act = (action) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <section className="detail">
      <RouteMap
        places={places}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={onSelectPlace}
        bottomPadding={expanded ? 120 : 150}
      />

      <div className="detail-bar">
        <button type="button" className="float-btn" onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
        <span className="float-title">{trip.title}</span>
        <button type="button" className="float-btn" onClick={() => setMenuOpen(true)} aria-label="여행 메뉴">
          <span style={{ fontSize: 15, letterSpacing: "0.05em", lineHeight: 1 }} aria-hidden="true">
            ⋯
          </span>
        </button>
      </div>

      <div className={`sheet${expanded ? " expanded" : ""}`}>
        <button
          type="button"
          className="sheet-grip"
          aria-label={expanded ? "목록 접기" : "목록 펼치기"}
          aria-expanded={expanded}
          onPointerDown={startGrip}
          onPointerUp={endGrip}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        />

        <div className="sheet-head">
          <h2>방문 순서 {places.length}곳</h2>
          <button type="button" onClick={onReorder} disabled={places.length < 2}>
            순서 변경
          </button>
        </div>

        <div className="sheet-body">
          {places.map((place) => {
            const media = mediaByPlace[place.id] || [];
            const cover = media.find((item) => item.type === "image") || media[0];
            const summary = describeMedia(media);
            const isActive = place.id === selectedPlaceId;

            return (
              <button
                key={place.id}
                type="button"
                className="stop"
                aria-current={isActive}
                onClick={() => (isActive ? onEditPlace(place.id) : onSelectPlace(place.id))}
              >
                <span className="stop-order">{padOrder(place.order)}</span>
                <span className={`stop-thumb thumb${cover ? "" : " alt"}`}>
                  {cover && mediaUrls[cover.id] ? <img src={mediaUrls[cover.id]} alt="" /> : null}
                </span>
                <span className="stop-copy">
                  <strong>{place.name}</strong>
                  <span>{[formatClock(place.visitedAt), summary].filter(Boolean).join(" · ")}</span>
                </span>
                {isActive ? (
                  <span className="stop-mark">
                    <span className="stop-edit">수정</span>
                    <span className="stop-dot" />
                  </span>
                ) : null}
              </button>
            );
          })}

          {!places.length ? (
            <p className="course-steps" style={{ padding: "18px 0" }}>
              아직 장소가 없습니다. 지도를 탭하거나 아래 버튼으로 첫 장소를 남겨 보세요.
            </p>
          ) : null}

          <div className="sheet-foot">
            <button className="pill solid compact" type="button" onClick={() => onAddPlace()} style={{ width: "100%" }}>
              ＋ 장소 추가
            </button>
          </div>
        </div>
      </div>

      {menuOpen ? (
        <>
          <div className="scrim" onClick={() => setMenuOpen(false)} role="presentation" />
          <div className="menu" role="dialog" aria-label="여행 메뉴">
            <div className="menu-grip" aria-hidden="true" />
            <button type="button" onClick={act(onOpenReels)} disabled={!places.length}>
              릴스로 돌아보기
            </button>
            <button type="button" onClick={act(onComplete)}>
              {trip.status === "complete" ? "다시 기록 중으로" : "여행 완료로 표시"}
            </button>
            <button type="button" onClick={act(onPublish)} disabled={!places.length}>
              피드에 코스 공개
            </button>
            <button type="button" className="quiet" onClick={act(onDeleteTrip)}>
              여행 삭제
            </button>
            <button type="button" className="quiet" onClick={() => setMenuOpen(false)}>
              닫기
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
