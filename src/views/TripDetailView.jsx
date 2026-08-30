import { Suspense, useRef, useState } from "react";
import RouteMap from "../components/RouteMapSwitch.jsx";
import { BackIcon, GripIcon } from "../components/Icons.jsx";
import { dayLabel, describeMedia, formatClock, groupByDay } from "../hooks.js";

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
    dragRef.current = { y: event.clientY };
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
      <Suspense fallback={<div className="detail-map map-fallback">지도를 여는 중</div>}>
      <RouteMap
        places={places}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={onSelectPlace}
        bottomPadding={expanded ? 120 : 150}
      />
      </Suspense>

      <div className="detail-bar">
        <button type="button" className="float-btn" onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
        <span className="float-title">{trip.title}</span>
        <button type="button" className="float-btn" onClick={() => setMenuOpen(true)} aria-label="여행 메뉴">
          <span className="dots" aria-hidden="true">
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

        <div className="sheet-body">
          {groupByDay(places).map(({ day, places: dayPlaces }) => (
            <section className="day-group" key={day}>
              <h2 className="day-head">
                {dayLabel(day)}
                <span>{dayPlaces.length}곳</span>
              </h2>

              {dayPlaces.map((place) => {
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
                    <span className="stop-order">{place.order}</span>
                    <span className={`stop-thumb thumb${cover ? "" : " alt"}`}>
                      {cover && mediaUrls[cover.id] ? <img src={mediaUrls[cover.id]} alt="" loading="lazy" /> : null}
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
            </section>
          ))}

          {!places.length ? (
            <p className="sheet-empty">
              아직 기록한 곳이 없습니다. 지도를 탭하거나 아래 버튼으로 1일차를 시작해 보세요.
            </p>
          ) : null}
        </div>

        <div className="sheet-foot">
          <button className="pill solid compact grow" type="button" onClick={() => onAddPlace()}>
            ＋ 장소 기록
          </button>
          <button
            type="button"
            className="circle-btn"
            onClick={onReorder}
            disabled={places.length < 2}
            aria-label="순서 변경"
          >
            <GripIcon width={18} height={18} />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <div className="scrim" onClick={() => setMenuOpen(false)} role="presentation" />
          <div className="menu" role="dialog" aria-label="여행 메뉴">
            <div className="menu-grip" aria-hidden="true" />
            <button type="button" onClick={act(onOpenReels)} disabled={!places.length}>
              코스 보기
            </button>
            <button type="button" onClick={act(onComplete)}>
              {trip.status === "complete" ? "다시 기록 중으로" : "기록 완료로 표시"}
            </button>
            <button type="button" onClick={act(onPublish)} disabled={!places.length}>
              검색에 코스 공개
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
