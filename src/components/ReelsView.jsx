import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon, PlayIcon } from "./Icons.jsx";
import { formatClock, formatDotDate, padOrder, useMediaUrls } from "../hooks.js";

const VISIBLE_THUMBS = 3;

/**
 * Playback, one full-height slide per place. Story-style segments across the
 * top track progress; the thumbnail row swaps which shot fills the slide.
 */
export default function ReelsView({ trip, places, mediaByPlace, startIndex = 0, onClose }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(startIndex);
  const [chosen, setChosen] = useState({});

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
    <section className="reels" aria-label={`${trip.title} 회고`}>
      <div className="reels-top">
        <div className="reels-progress" aria-hidden="true">
          {places.map((place, index) => (
            <i key={place.id} className={index <= active ? "on" : ""} />
          ))}
        </div>
        <div className="reels-head">
          <span className="eyebrow">
            {trip.title} · {padOrder(active + 1)} / {padOrder(places.length)}
          </span>
          <button type="button" onClick={onClose} aria-label="회고 닫기">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="reels-track" ref={trackRef}>
        {places.map((place, index) => {
          const media = mediaByPlace[place.id] || [];
          const activeMediaId = chosen[place.id] || media[0]?.id;
          const activeMedia = media.find((item) => item.id === activeMediaId) || media[0];
          const extra = media.length - VISIBLE_THUMBS;

          return (
            <article key={place.id} className="reel" data-index={index}>
              <div className="reel-media">
                {activeMedia && urlById[activeMedia.id] ? (
                  activeMedia.type === "video" ? (
                    <video src={urlById[activeMedia.id]} controls playsInline preload="metadata" />
                  ) : (
                    <img src={urlById[activeMedia.id]} alt={activeMedia.name || place.name} />
                  )
                ) : (
                  <div className="ph">PHOTO / VIDEO — {place.name}</div>
                )}
              </div>
              <div className="reel-scrim" aria-hidden="true" />

              <div className="reel-copy">
                <span className="eyebrow">
                  {formatDotDate(place.visitedAt)} · {formatClock(place.visitedAt)}
                </span>
                <h2>{place.name}</h2>
                {place.note ? <p>{place.note}</p> : null}

                {media.length ? (
                  <div className="reel-thumbs">
                    {media.slice(0, VISIBLE_THUMBS).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={item.id === activeMedia?.id}
                        aria-label={`${place.name} 미디어 보기`}
                        onClick={() => setChosen((current) => ({ ...current, [place.id]: item.id }))}
                      >
                        {item.type === "video" ? (
                          <span className="more">
                            <PlayIcon />
                          </span>
                        ) : (
                          <img src={urlById[item.id]} alt="" />
                        )}
                      </button>
                    ))}
                    {extra > 0 ? (
                      <button
                        type="button"
                        className="more-wrap"
                        onClick={() =>
                          setChosen((current) => ({ ...current, [place.id]: media[VISIBLE_THUMBS].id }))
                        }
                        aria-label={`${place.name} 미디어 ${extra}개 더 보기`}
                      >
                        <span className="more">+{extra}</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {index < places.length - 1 ? <p className="reel-hint">위로 밀어 다음 장소</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
