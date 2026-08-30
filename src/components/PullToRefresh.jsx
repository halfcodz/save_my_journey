import { useEffect, useRef, useState } from "react";

const THRESHOLD = 64;
const MAX_PULL = 92;
const RESISTANCE = 0.55;

/**
 * Pull the top of a screen down to reload.
 *
 * This listens to raw touch events rather than pointer events: once a vertical
 * drag starts the browser takes over scrolling and fires `pointercancel`, which
 * kills a pointer-based gesture before it ever registers. A non-passive
 * `touchmove` lets us claim the pull while the list is already at the top.
 */
export default function PullToRefresh({ onRefresh, className = "", children }) {
  const scrollRef = useRef(null);
  const stateRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;

    const onTouchStart = (event) => {
      if (refreshing || event.touches.length !== 1) return;
      if (node.scrollTop > 0) return;
      const touch = event.touches[0];
      stateRef.current = { startX: touch.clientX, startY: touch.clientY, claimed: false, distance: 0 };
      suppressClickRef.current = false;
    };

    const onTouchMove = (event) => {
      const state = stateRef.current;
      if (!state || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      if (!state.claimed) {
        if (Math.abs(dx) > Math.abs(dy)) {
          stateRef.current = null; // 가로 제스처는 탭 전환에 넘긴다
          return;
        }
        if (dy < 10) return;
        if (node.scrollTop > 0) {
          stateRef.current = null;
          return;
        }
        state.claimed = true;
        suppressClickRef.current = true;
      }

      if (dy <= 0) {
        state.distance = 0;
        setPull(0);
        return;
      }

      // 이 시점부터는 브라우저의 고무줄 스크롤 대신 우리가 그린다.
      if (event.cancelable) event.preventDefault();
      state.distance = Math.min(MAX_PULL, dy * RESISTANCE);
      setPull(state.distance);
    };

    const onTouchEnd = async () => {
      const state = stateRef.current;
      stateRef.current = null;
      if (!state?.claimed) return;

      if (state.distance >= THRESHOLD) {
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

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, refreshing]);

  // 마우스에서도 확인할 수 있도록 포인터 경로를 함께 둔다.
  const mouseRef = useRef(null);
  const onPointerDown = (event) => {
    if (event.pointerType !== "mouse" || refreshing) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    mouseRef.current = { startY: event.clientY, claimed: false, distance: 0 };
  };
  const onPointerMove = (event) => {
    const state = mouseRef.current;
    if (!state) return;
    const dy = event.clientY - state.startY;
    if (!state.claimed) {
      if (dy < 10) return;
      state.claimed = true;
      suppressClickRef.current = true;
    }
    state.distance = Math.min(MAX_PULL, Math.max(0, dy * RESISTANCE));
    setPull(state.distance);
  };
  const onPointerUp = async () => {
    const state = mouseRef.current;
    mouseRef.current = null;
    if (!state?.claimed) return;
    if (state.distance >= THRESHOLD) {
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
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        suppressClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="ptr-indicator" style={{ height: pull, opacity: active ? 1 : 0 }} aria-hidden={!active}>
        <span className={`ptr-spinner${refreshing ? " is-spinning" : ""}`} />
        <span className="ptr-label">
          {refreshing ? "새로고침 중" : pull >= THRESHOLD ? "놓으면 새로고침" : "당겨서 새로고침"}
        </span>
      </div>
      <div
        className="ptr-body"
        style={{
          transform: `translate3d(0, ${pull}px, 0)`,
          transition: pull && !refreshing ? "none" : "transform 260ms cubic-bezier(0.22,0.9,0.28,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
