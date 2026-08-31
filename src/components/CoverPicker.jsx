import { createPortal } from "react-dom";
import { useMediaUrls } from "../hooks.js";

/**
 * Pick which photo represents a course. Only the trip's own photos are offered
 * — the cover should be something from the trip itself.
 */
export default function CoverPicker({ trip, media, onSelect, onClose }) {
  const photos = useMediaUrls(media);

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} role="presentation" />
      <div className="menu cover-picker" role="dialog" aria-label={`${trip.title} 대표 사진`}>
        <div className="menu-grip" aria-hidden="true" />
        <p className="menu-title">대표 사진 고르기</p>
        <div className="cover-grid">
          {photos.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={trip.coverMediaId === item.id}
              onClick={() => onSelect(item.id)}
            >
              <img src={item.url} alt="" />
            </button>
          ))}
        </div>
        <button type="button" className="quiet" onClick={onClose}>
          닫기
        </button>
      </div>
    </>,
    document.body
  );
}
