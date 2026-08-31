import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "./Icons.jsx";
import RouteMap from "./RouteMapSwitch.jsx";
import { dayLabel, formatClock, groupByDay, useMediaUrls, useThemeColor } from "../hooks.js";

const SWIPE_DISTANCE = 0.14;   // 화면 폭의 20%를 넘기면 일차가 바뀐다
const SWIPE_VELOCITY = 0.28;
const AXIS_SLOP = 8;
const MAP_PULL = 90;          // 위로 이만큼 밀면 지도가 열린다

/**
 * 코스 보기 — a story deck. A day is one story: tapping moves through its
 * photos, a sideways swipe changes the day, and pushing the deck up lifts the
 * map with that day's pins behind it.
 */
export default function CourseView({ trip, places, mediaByDay, onClose }) {
  const days = useMemo(() => groupByDay(places), [places]);
  const [dayIndex, setDayIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragAxis, setDragAxis] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPlaceId, setMapPlaceId] = useState("");
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const gestureRef = useRef(null);
  const handlersRef = useRef({});

  useThemeColor("#000000");

  const allMedia = useMemo(() => Object.values(mediaByDay).flat(), [mediaByDay]);
  const mediaUrls = useMediaUrls(allMedia);
  const urlById = useMemo(() => Object.fromEntries(mediaUrls.map((m) => [m.id, m.url])), [mediaUrls]);

  // 한 일차의 사진을 장소 순서대로 이어 붙인다.
  const framesByDay = useMemo(
    () =>
      days.map(({ day, places: dayPlaces }) => {
        const frames = dayPlaces.flatMap((place) => {
          const media = mediaByDay[place.id] || [];
          return media.length
            ? media.map((item) => ({ key: item.id, place, media: item }))
            : [{ key: `${place.id}-empty`, place, media: null }];
        });
        return { day, places: dayPlaces, frames };
      }),
    [days, mediaByDay]
  );

  const current = framesByDay[dayIndex];
  const frames = current?.frames || [];
  const frame = frames[Math.min(photoIndex, frames.length - 1)];

  useEffect(() => setPhotoIndex(0), [dayIndex]);

  const goDay = (next) => {
    if (next < 0 || next >= framesByDay.length) return false;
    setDayIndex(next);
    return true;
  };

  const nextPhoto = () => {
    if (photoIndex < frames.length - 1) {
      setPhotoIndex((i) => i + 1);
      return;
    }
    if (!goDay(dayIndex + 1)) onClose();
  };

  const prevPhoto = () => {
    if (photoIndex > 0) {
      setPhotoIndex((i) => i - 1);
      return;
    }
    goDay(dayIndex - 1);
  };

  const width = () => frameRef.current?.clientWidth || 1;

  const beginGesture = (target, x, y, timeStamp, id) => {
    if (target.closest?.("[data-no-swipe]")) return false;
    gestureRef.current = { id, x, y, lastX: x, lastT: timeStamp, velocity: 0, axis: null, moved: false };
    return true;
  };

  const moveGesture = (x, y, timeStamp) => {
    const g = gestureRef.current;
    if (!g) return;

    const dx = x - g.x;
    const dy = y - g.y;

    if (!g.axis) {
      if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      g.moved = true;
      setDragAxis(g.axis);
      setAnimating(false);
    }

    if (g.axis === "y") {
      if (dy < 0) setDrag(Math.max(-MAP_PULL, dy) / MAP_PULL);
      return;
    }

    const dt = timeStamp - g.lastT;
    if (dt > 0) g.velocity = (x - g.lastX) / dt;
    g.lastX = x;
    g.lastT = timeStamp;

    const atStart = dayIndex === 0 && dx > 0;
    const atEnd = dayIndex === framesByDay.length - 1 && dx < 0;
    setDrag((atStart || atEnd ? dx * 0.3 : dx) / width());
  };

  const endGesture = (x, y) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    setAnimating(true);
    setDragAxis(null);
    if (!g) return;

    if (!g.moved) {
      const rect = frameRef.current.getBoundingClientRect();
      if (x - rect.left < rect.width / 3) prevPhoto();
      else nextPhoto();
      setDrag(0);
      return;
    }

    if (g.axis === "y") {
      if (y - g.y < -MAP_PULL * 0.6) {
        setMapPlaceId(frame?.place.id || "");
        setMapOpen(true);
      }
      setDrag(0);
      return;
    }

    const dx = x - g.x;
    const passed = Math.abs(dx) > width() * SWIPE_DISTANCE || Math.abs(g.velocity) > SWIPE_VELOCITY;
    if (passed) goDay(dayIndex + (dx < 0 ? 1 : -1));
    setDrag(0);
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "touch") return; // 터치는 touch 이벤트가 맡는다
    if (event.target.closest("[data-no-swipe]")) return;
    gestureRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      axis: null,
      moved: false,
    };
  };

  const onPointerMove = (event) => {
    if (event.pointerType === "touch") return;
    const g = gestureRef.current;
    if (!g || event.pointerId !== g.id) return;

    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;

    if (!g.axis) {
      if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      setDragAxis(g.axis);
      g.moved = true;
      setAnimating(false);
    }

    if (g.axis === "y") {
      if (dy < 0) setDrag(Math.max(-MAP_PULL, dy) / MAP_PULL); // -1..0, 위로 밀기
      return;
    }

    const dt = event.timeStamp - g.lastT;
    if (dt > 0) g.velocity = (event.clientX - g.lastX) / dt;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;

    const atStart = dayIndex === 0 && dx > 0;
    const atEnd = dayIndex === framesByDay.length - 1 && dx < 0;
    setDrag((atStart || atEnd ? dx * 0.3 : dx) / width());
  };

  const onPointerUp = (event) => {
    if (event.pointerType === "touch") return;
    const g = gestureRef.current;
    gestureRef.current = null;
    setAnimating(true);
    setDragAxis(null);

    if (!g) return;

    if (!g.moved) {
      // 제자리 탭 — 왼쪽 1/3은 이전, 나머지는 다음 사진
      const rect = frameRef.current.getBoundingClientRect();
      if (event.clientX - rect.left < rect.width / 3) prevPhoto();
      else nextPhoto();
      setDrag(0);
      return;
    }

    if (g.axis === "y") {
      const dy = event.clientY - g.y;
      if (dy < -MAP_PULL * 0.6) {
        setMapPlaceId(frame?.place.id || "");
        setMapOpen(true);
      }
      setDrag(0);
      return;
    }

    const dx = event.clientX - g.x;
    const passed = Math.abs(dx) > width() * SWIPE_DISTANCE || Math.abs(g.velocity) > SWIPE_VELOCITY;
    if (passed) goDay(dayIndex + (dx < 0 ? 1 : -1));
    setDrag(0);
  };

  // React는 touchmove를 passive로 붙여 preventDefault가 통하지 않는다.
  // iOS가 제스처를 스크롤로 가져가 pointercancel을 쏘는 것을 막으려면 직접 건다.
  handlersRef.current = { beginGesture, moveGesture, endGesture };

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;

    const start = (event) => {
      if (event.touches.length !== 1) return;
      const t = event.touches[0];
      handlersRef.current.beginGesture(event.target, t.clientX, t.clientY, event.timeStamp, "touch");
    };
    const move = (event) => {
      if (!gestureRef.current || event.touches.length !== 1) return;
      const t = event.touches[0];
      handlersRef.current.moveGesture(t.clientX, t.clientY, event.timeStamp);
      if (gestureRef.current?.axis && event.cancelable) event.preventDefault();
    };
    const end = (event) => {
      const t = event.changedTouches[0];
      handlersRef.current.endGesture(t?.clientX ?? 0, t?.clientY ?? 0);
    };

    node.addEventListener("touchstart", start, { passive: true });
    node.addEventListener("touchmove", move, { passive: false });
    node.addEventListener("touchend", end, { passive: true });
    node.addEventListener("touchcancel", end, { passive: true });
    return () => {
      node.removeEventListener("touchstart", start);
      node.removeEventListener("touchmove", move);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", end);
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") (mapOpen ? setMapOpen(false) : onClose());
      if (event.key === "ArrowRight") nextPhoto();
      if (event.key === "ArrowLeft") prevPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!framesByDay.length) {
    return (
      <section className="reels" aria-label={`${trip.title} 코스 보기`}>
        <div className="reels-top">
          <div className="reels-head">
            <span className="eyebrow">{trip.title}</span>
            <button type="button" onClick={onClose} aria-label="닫기">
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="reel-media">
          <div className="ph">아직 기록한 곳이 없습니다</div>
        </div>
      </section>
    );
  }

  const trackStyle = dragAxis === "y"
    ? { transform: `translate3d(0, ${drag * MAP_PULL}px, 0)`, opacity: 1 + drag * 0.25 }
    : { transform: `translate3d(${drag * 100}%, 0, 0)` };

  return (
    <section className="reels" aria-label={`${trip.title} 코스 보기`} ref={frameRef}>
      <div
        ref={stageRef}
        className={`reel-stage${animating ? " is-settling" : ""}`}
        style={trackStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTransitionEnd={() => setAnimating(false)}
      >
        <div className="reel-media">
          {frame?.media && urlById[frame.media.id] ? (
            frame.media.type === "video" ? (
              <video src={urlById[frame.media.id]} controls playsInline preload="metadata" data-no-swipe />
            ) : (
              <img src={urlById[frame.media.id]} alt={frame.media.name || frame.place.name} />
            )
          ) : (
            <div className="ph">사진 없음 — {frame?.place.name}</div>
          )}
        </div>
        <div className="reel-scrim" aria-hidden="true" />

        <div className="reel-copy">
          <span className="eyebrow">
            {dayLabel(current.day)} · {formatClock(frame?.place.visitedAt)}
          </span>
          <h2>{frame?.place.name}</h2>
          {frame?.place.note ? <p>{frame.place.note}</p> : null}
        </div>
      </div>

      <div className="reels-top">
        <div className="reels-progress" aria-hidden="true">
          {frames.map((item, index) => (
            <i key={item.key} className={index <= photoIndex ? "on" : ""} />
          ))}
        </div>
        <div className="reels-head">
          <span className="eyebrow">
            {trip.title} · {dayLabel(current.day)}
          </span>
          <button type="button" onClick={onClose} aria-label="닫기" data-no-swipe>
            <CloseIcon />
          </button>
        </div>
        <div className="reels-days" data-no-swipe>
          {framesByDay.map((item, index) => (
            <button
              key={item.day}
              type="button"
              aria-pressed={index === dayIndex}
              onClick={() => setDayIndex(index)}
            >
              {dayLabel(item.day)}
            </button>
          ))}
        </div>
      </div>

      {mapOpen ? (
        <div className="course-map" role="dialog" aria-label={`${dayLabel(current.day)} 지도`}>
            <RouteMap
              places={current.places}
              kind={trip.kind}
              selectedPlaceId={mapPlaceId || frame?.place.id}
              onSelectPlace={setMapPlaceId}
              topPadding={190}
              bottomPadding={230}
            />

          <div className="course-map-bar">
            <span className="float-title">
              {dayLabel(current.day)} · {current.places.length}곳
            </span>
            <button type="button" className="float-btn" onClick={() => setMapOpen(false)} aria-label="지도 닫기">
              <CloseIcon />
            </button>
          </div>

          {/* 핀이 겹쳐도 순서를 읽을 수 있도록 목록을 함께 둔다. */}
          <div className="course-map-list">
            <div className="course-map-grip" aria-hidden="true" />
            <ul>
              {current.places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    aria-current={(mapPlaceId || frame?.place.id) === place.id}
                    onClick={() => setMapPlaceId(place.id)}
                  >
                    <span className="stop-order">{place.order}</span>
                    <span className="stop-copy">
                      <strong>{place.name}</strong>
                      <span>{formatClock(place.visitedAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
