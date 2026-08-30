import { useEffect, useRef, useState } from "react";
import { GripIcon } from "./Icons.jsx";
import { formatClock, padOrder } from "../hooks.js";

/**
 * Drag-to-reorder. The row being moved lifts out of the flow as a black card
 * and leaves a dashed slot behind it, matching artboard 06. Arrow keys move a
 * focused row so the screen stays usable without a pointer.
 */
export default function ReorderScreen({ places, onCancel, onDone }) {
  const [list, setList] = useState(places);
  const [drag, setDrag] = useState(null);
  const listRef = useRef(null);
  const rowHeightRef = useRef(56);

  const move = (from, to) => {
    if (to < 0 || to >= list.length || from === to) return;
    setList((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const startDrag = (index) => (event) => {
    if (event.button != null && event.button !== 0) return;
    const row = event.currentTarget.closest("li");
    const listRect = listRef.current?.getBoundingClientRect();
    if (!row || !listRect) return;


    event.preventDefault();
    const rowRect = row.getBoundingClientRect();
    rowHeightRef.current = rowRect.height;

    setDrag({
      index,
      pointerId: event.pointerId,
      grabOffset: event.clientY - rowRect.top,
      top: rowRect.top,
      left: rowRect.left,
      width: rowRect.width,
      listTop: listRect.top,
    });
  };

  useEffect(() => {
    if (!drag) return undefined;

    const onMove = (event) => {
      if (event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      const top = event.clientY - drag.grabOffset;
      const target = Math.max(
        0,
        Math.min(list.length - 1, Math.round((top - drag.listTop) / rowHeightRef.current))
      );

      setDrag((current) => (current ? { ...current, top, index: target } : current));
      if (target !== drag.index) move(drag.index, target);
    };

    const onEnd = () => setDrag(null);

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [drag, list.length]);

  const onRowKeyDown = (index) => (event) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    move(index, index + (event.key === "ArrowUp" ? -1 : 1));
  };

  return (
    <section className="screen">
      <div className="modal-bar">
        <button type="button" className="cancel" onClick={onCancel}>
          취소
        </button>
        <span className="title">순서 변경</span>
        <button type="button" className="confirm" onClick={() => onDone(list)}>
          완료
        </button>
      </div>

      <p className="reorder-lede">
        끌어서
        <br />
        순서를 바꿔요
      </p>

      <div className="scroll">
        <ul className="reorder-list" ref={listRef}>
          {list.map((place, index) =>
            drag && drag.index === index ? (
              <li key={place.id} className="reorder-gap" aria-hidden="true" />
            ) : (
              <li
                key={place.id}
                className="reorder-row"
                tabIndex={0}
                onKeyDown={onRowKeyDown(index)}
                aria-label={`${index + 1}번 ${place.name}. 위아래 화살표로 순서를 바꿉니다.`}
              >
                <span className="num">{padOrder(index + 1)}</span>
                <span className="name">{place.name}</span>
                <span className="time">{formatClock(place.visitedAt)}</span>
                <button
                  type="button"
                  className="grip"
                  aria-label={`${place.name} 끌어서 옮기기`}
                  onPointerDown={startDrag(index)}
                >
                  <GripIcon />
                </button>
              </li>
            )
          )}
        </ul>
      </div>

      {drag ? (
        <div
          className="reorder-row is-dragging"
          style={{ position: "fixed", top: drag.top, left: drag.left, width: drag.width, pointerEvents: "none" }}
          aria-hidden="true"
        >
          <span className="num">{padOrder(drag.index + 1)}</span>
          <span className="name">{list[drag.index]?.name}</span>
          <span className="time">{formatClock(list[drag.index]?.visitedAt)}</span>
          <span className="grip">
            <GripIcon />
          </span>
        </div>
      ) : null}
    </section>
  );
}
