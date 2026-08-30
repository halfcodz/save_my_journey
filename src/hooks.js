import { useEffect, useMemo, useState } from "react";

export function useMediaUrls(mediaItems) {
  const stableIds = useMemo(() => mediaItems.map((item) => item.id).join("|"), [mediaItems]);
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    const next = mediaItems.map((item) => ({ ...item, url: URL.createObjectURL(item.blob) }));
    setUrls(next);

    return () => {
      next.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [stableIds]);

  return urls;
}

/** Object URLs for a `{ key: mediaRecord }` map, revoked whenever the set changes. */
export function useBlobUrlMap(recordMap) {
  const stableIds = useMemo(
    () =>
      Object.entries(recordMap || {})
        .map(([key, item]) => `${key}:${item?.id || ""}`)
        .sort()
        .join("|"),
    [recordMap]
  );
  const [urls, setUrls] = useState({});

  useEffect(() => {
    const created = [];
    const next = {};
    Object.entries(recordMap || {}).forEach(([key, item]) => {
      if (!item?.blob) return;
      const url = URL.createObjectURL(item.blob);
      created.push(url);
      next[key] = url;
    });
    setUrls(next);

    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [stableIds]);

  return urls;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Captures `beforeinstallprompt` so the profile screen can offer a real install. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(
    () => typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches
  );

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return "unavailable";
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome;
  };

  return { canInstall: Boolean(deferred), installed, promptInstall };
}

/* --- formatting -------------------------------------------------------- */

export function formatDateTime(value) {
  if (!value) return "시간 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/** `2026.08.28` — the dotted form the design uses for dates. */
export function formatDotDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** `10:30` — the 24h clock used on timeline rails and place rows. */
export function formatClock(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** `8월 28일 금요일` — the home screen eyebrow. */
export function formatLongDate(value = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date(value));
}

/** `1차` — v3 counts visits as rounds rather than zero-padded indexes. */
export const orderLabel = (order) => `${order ?? 0}차`;

/** `2026.06.11 – 06.14` when a trip spans days, otherwise a single date. */
export function formatDateRange(startValue, endValue) {
  const start = formatDotDate(startValue);
  if (!endValue) return start;
  const end = new Date(endValue);
  const startDate = new Date(startValue);
  if (start === formatDotDate(endValue)) return start;
  const pad = (part) => String(part).padStart(2, "0");
  return startDate.getFullYear() === end.getFullYear()
    ? `${start} – ${pad(end.getMonth() + 1)}.${pad(end.getDate())}`
    : `${start} – ${formatDotDate(endValue)}`;
}

export function toDateInput(value) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function toTimeInput(value) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(11, 16);
}

export function fromDateTimeParts(dateValue, timeValue) {
  if (!dateValue) return new Date().toISOString();
  return new Date(`${dateValue}T${timeValue || "00:00"}`).toISOString();
}

/** `사진 3 · 영상 1` — the media summary that appears under place names. */
export function describeMedia(items = []) {
  const photos = items.filter((item) => item.type === "image").length;
  const videos = items.filter((item) => item.type === "video").length;
  const parts = [];
  if (photos) parts.push(`사진 ${photos}`);
  if (videos) parts.push(`영상 ${videos}`);
  return parts.join(" · ");
}
