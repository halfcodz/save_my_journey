import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "./Icons.jsx";
import { dayLabel, formatClock, useMediaUrls, useThemeColor } from "../hooks.js";

/**
 * 코스 보기 — every photo of the course, one per screen, in visit order. The
 * day and the place ride along the top so you always know where you are.
 */
export default function ReelsView({ trip, places, mediaByPlace, startPlaceId, onClose }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  useThemeColor("#000000");

  // 장소마다 사진이 여러 장이므로 사진 한 장이 한 화면이다.
  const slides = useMemo(
    () =>
      places.flatMap((place) => {
        const media = mediaByPlace[place.id] || [];
        if (!media.length) return [{ key: `${place.id}-empty`, place, media: null }];
        return media.map((item) => ({ key: item.id, place, media: item }));
      }),
    [places, mediaByPlace]
  );

  const allMedia = useMemo(() => slides.filter((s) => s.media).map((s) => s.media), [slides]);
  const mediaUrls = useMediaUrls(allMedia);
  const urlById = useMemo(() => Object.fromEntries(mediaUrls.map((item) => [item.id, item.url])), [mediaUrls]);

  const startIndex = useMemo(() => {
    const found = slides.findIndex((slide) => slide.place.id === startPlaceId);
    return found > 0 ? found : 0;
  }, [slides, startPlaceId]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !startIndex) return;
    track.scrollTo({ top: startIndex * track.clientHeight, behavior: "auto" });
    setActive(startIndex);
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
  }, [slides.length]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = slides[active];

  return (
    <section className="reels" aria-label={`${trip.title} 코스 보기`}>
      <div className="reels-top">
        <div className="reels-progress" aria-hidden="true">
          {slides.map((slide, index) => (
            <i key={slide.key} className={index <= active ? "on" : ""} />
          ))}
        </div>
        <div className="reels-head">
          <span className="eyebrow">
            {trip.title}
            {current ? ` · ${dayLabel(current.place.day)}` : ""}
          </span>
          <button type="button" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="reels-track" ref={trackRef}>
        {slides.map((slide, index) => {
          const { place, media } = slide;
          const next = slides[index + 1];
          const isNewPlace = !next || next.place.id !== place.id;

          return (
            <article key={slide.key} className="reel" data-index={index}>
              <div className="reel-media">
                {media && urlById[media.id] ? (
                  media.type === "video" ? (
                    <video src={urlById[media.id]} controls playsInline preload="metadata" />
                  ) : (
                    <img src={urlById[media.id]} alt={media.name || place.name} />
                  )
                ) : (
                  <div className="ph">사진 없음 — {place.name}</div>
                )}
              </div>
              <div className="reel-scrim" aria-hidden="true" />

              <div className="reel-copy">
                <span className="eyebrow">
                  {dayLabel(place.day)} · {formatClock(place.visitedAt)}
                </span>
                <h2>{place.name}</h2>
                {place.note ? <p>{place.note}</p> : null}
                {next ? (
                  <p className="reel-hint">
                    {isNewPlace ? `위로 밀어 ${next.place.name}` : "위로 밀어 다음 사진"}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}

        {!slides.length ? (
          <article className="reel">
            <div className="reel-media">
              <div className="ph">아직 기록한 곳이 없습니다</div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
