import { useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks.js";

const THRESHOLD = 68;    // 이만큼 당기면 놓았을 때 새로고침
const MAX_PULL = 96;     // 그 이상은 거의 움직이지 않는다
const RESISTANCE = 0.5;

/**
 * Pull the top of a screen down to reload. Only arms when the list is already
 * scrolled to the top, and gives up the gesture the moment it looks horizontal
 * so it never fights the tab pager.
 */
export default function PullToRefresh({ onRefresh, className = "", children }) {
  const scrollRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const onPointerDown = (event) => {
    if (refreshing) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    suppressClickRef.current = false;
    gestureRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, armed: false };
  };

  const onPointerMove = (event) => {
    const g = gestureRef.current;
    if (!g || event.pointerId !== g.id) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    if (!g.armed) {
      if (Math.abs(dx) > Math.abs(dy)) {
        gestureRef.current = null; // 가로 제스처는 탭 전환에 양보
        return;
      }
      if (dy < 8) return;
      g.armed = true;
      // 드래그 뒤에도 브라우저는 손가락 아래 요소로 click을 보낸다.
      // 막지 않으면 당겨서 새로고침이 카드를 열어 버린다.
      suppressClickRef.current = true;
    }

    if (dy <= 0 || (scrollRef.current?.scrollTop ?? 0) > 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(MAX_PULL, dy * RESISTANCE));
  };

  const finish = async () => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g?.armed) return;

    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
      return;
    }
    setPull(0);
  };

  const active = pull > 0 || refreshing;

  return (
    <div
      className={`ptr ${className}`}
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        className="ptr-indicator"
        style={{ height: pull, opacity: active ? 1 : 0 }}
        aria-hidden={!active}
      >
        <span className={`ptr-spinner${refreshing ? " is-spinning" : ""}`} />
        <span className="ptr-label">
          {refreshing ? "새로고침 중" : pull >= THRESHOLD ? "놓으면 새로고침" : "당겨서 새로고침"}
        </span>
      </div>
      <div
        className="ptr-body"
        style={{
          transform: `translate3d(0, ${pull}px, 0)`,
          transition: gestureRef.current || reducedMotion ? "none" : "transform 260ms cubic-bezier(0.22,0.9,0.28,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
