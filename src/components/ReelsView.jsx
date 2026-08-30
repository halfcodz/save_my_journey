import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "./Icons.jsx";
import { formatClock, orderLabel, useMediaUrls, useThemeColor } from "../hooks.js";

/**
 * 코스 보기 — one full-height slide per stop, swiped vertically. The photo
 * fills the frame and the feeling written at that stop sits over the gradient.
 */
export default function ReelsView({ trip, places, mediaByPlace, startIndex = 0, onClose }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(startIndex);

  useThemeColor("#000000"); // 재생 화면은 전체가 검정이므로 상태바까지 맞춘다

  const allMedia = useMemo(
    () => places.flatMap((place) => mediaByPlace[place.id] || []),
    [places, mediaByPlace]
  );
  const mediaUrls = useMediaUrls(allMedia);
  const urlById = useMemo(
    () => Object.fromEntries(mediaUrls.map((item) => [item.id, item.url])),
    [mediaUrls]
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !startIndex) return;
    track.scrollTo({ top: startIndex * track.clientHeight, behavior: "auto" });
  }, [startIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
        });
      },
      { root: track, threshold: 0.6 }
    );

    track.querySelectorAll("[data-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [places.length]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section className="reels" aria-label={`${trip.title} 코스 보기`}>
      <div className="reels-top">
        <div className="reels-progress" aria-hidden="true">
          {places.map((place, index) => (
            <i key={place.id} className={index <= active ? "on" : ""} />
          ))}
        </div>
        <div className="reels-head">
          <span className="eyebrow">{trip.title}</span>
          <button type="button" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="reels-track" ref={trackRef}>
        {places.map((place, index) => {
          const media = mediaByPlace[place.id] || [];
          const cover = media.find((item) => item.type === "image") || media[0];
          const next = places[index + 1];

          return (
            <article key={place.id} className="reel" data-index={index}>
              <div className="reel-media">
                {cover && urlById[cover.id] ? (
                  cover.type === "video" ? (
                    <video src={urlById[cover.id]} controls playsInline preload="metadata" />
                  ) : (
                    <img src={urlById[cover.id]} alt={cover.name || place.name} />
                  )
                ) : (
                  <div className="ph">PHOTO — {place.name}</div>
                )}
              </div>
              <div className="reel-scrim" aria-hidden="true" />

              <div className="reel-copy">
                <span className="eyebrow">
                  {orderLabel(place.order)} · {formatClock(place.visitedAt)}
                </span>
                <h2>{place.name}</h2>
                {place.note ? <p>{place.note}</p> : null}
                {next ? <p className="reel-hint">위로 밀어 {orderLabel(next.order)}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
