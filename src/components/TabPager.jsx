import { useCallback, useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks.js";

const SWIPE_DISTANCE_RATIO = 0.22; // 화면 폭의 22%를 넘기면 페이지 전환
const SWIPE_VELOCITY = 0.45; // px/ms — 짧게 튕겨도 넘어가도록
const AXIS_LOCK_SLOP = 6; // 가로/세로 의도를 가르는 최소 이동량
const EDGE_RESISTANCE = 0.32; // 양 끝에서 고무줄처럼 저항

/**
 * Instagram-style horizontal pager. Panes live side by side and the track
 * follows the finger 1:1; releasing settles to the nearest page. Vertical
 * scrolling inside a pane is left to the browser via `touch-action: pan-y`,
 * and the axis lock means a mostly-vertical drag never steals the scroll.
 */
export default function TabPager({ index, count, onIndexChange, children }) {
  const frameRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [drag, setDrag] = useState(0);
  const [animating, setAnimating] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const width = () => frameRef.current?.clientWidth || 1;

  const settle = useCallback(
    (nextIndex) => {
      setDrag(0);
      setAnimating(true);
      if (nextIndex !== index) onIndexChange(nextIndex);
    },
    [index, onIndexChange]
  );

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target.closest("[data-no-swipe]")) return;
    suppressClickRef.current = false;
    gestureRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
      axis: null,
    };
  };

  const onPointerMove = (event) => {
    const g = gestureRef.current;
    if (!g || event.pointerId !== g.id) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    if (!g.axis) {
      if (Math.abs(dx) < AXIS_LOCK_SLOP && Math.abs(dy) < AXIS_LOCK_SLOP) return;
      g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (g.axis === "y") {
        gestureRef.current = null; // 세로 제스처는 스크롤에 양보한다
        return;
      }
      setAnimating(false);
    }

    const dt = event.timeStamp - g.lastT;
    if (dt > 0) g.velocity = (event.clientX - g.lastX) / dt;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;

    const atStart = index === 0 && dx > 0;
    const atEnd = index === count - 1 && dx < 0;
    setDrag(atStart || atEnd ? dx * EDGE_RESISTANCE : dx);
  };

  const onPointerUp = (event) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.axis !== "x" || event.pointerId !== g.id) return;

    const dx = event.clientX - g.startX;

    // 드래그가 끝나면 브라우저는 손가락 아래 요소로 click을 마저 보낸다.
    // 그대로 두면 스와이프가 카드나 버튼을 눌러 버린다.
    if (Math.abs(dx) > AXIS_LOCK_SLOP) suppressClickRef.current = true;

    const passedDistance = Math.abs(dx) > width() * SWIPE_DISTANCE_RATIO;
    const passedFlick = Math.abs(g.velocity) > SWIPE_VELOCITY;
    const direction = dx < 0 ? 1 : -1;

    const next =
      passedDistance || passedFlick
        ? Math.min(count - 1, Math.max(0, index + direction))
        : index;
    settle(next);
  };

  useEffect(() => {
    setDrag(0);
    setAnimating(true);
  }, [index]);

  const offset = `calc(${-index * 100}% + ${drag}px)`;

  return (
    <div
      className="pager"
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className={`pager-track${animating && !reducedMotion ? " is-settling" : ""}`}
        style={{ width: `${count * 100}%`, transform: `translate3d(${offset}, 0, 0)` }}
        onTransitionEnd={() => setAnimating(false)}
      >
        {children.map((pane, paneIndex) => (
          <div
            className="pager-pane"
            key={paneIndex}
            style={{ width: `${100 / count}%` }}
            aria-hidden={paneIndex !== index}
            inert={paneIndex !== index ? "" : undefined}
          >
            {pane}
          </div>
        ))}
      </div>
    </div>
  );
}
