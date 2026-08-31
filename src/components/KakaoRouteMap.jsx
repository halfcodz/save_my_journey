import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "../kakaoLoader.js";
import { fetchRoute } from "../routeSearch.js";
import { tripKind } from "../tripKinds.js";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const WALK_MPS = (4.5 * 1000) / 3600;

const formatDistance = (metres) =>
  metres >= 1000 ? `${(metres / 1000).toFixed(metres >= 10000 ? 0 : 1)}km` : `${Math.round(metres)}m`;

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0분";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

/**
 * The trip route on Kakao's map. Pins point at their spot; the road-following
 * line and the drive time come from Kakao's directions, and walking time is
 * derived from that road distance.
 */
export default function KakaoRouteMap({
  places,
  kind,
  selectedPlaceId,
  onSelectPlace,
  onPickPoint,
  topPadding = 150,
  bottomPadding = 150,
}) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const lineRef = useRef(null);
  const selectRef = useRef(onSelectPlace);
  const pickRef = useRef(onPickPoint);
  const [route, setRoute] = useState(null);

  useEffect(() => {
    selectRef.current = onSelectPlace;
    pickRef.current = onPickPoint;
  });

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !nodeRef.current || mapRef.current) return;
        const map = new kakao.maps.Map(nodeRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 5,
        });
        mapRef.current = map;

        kakao.maps.event.addListener(map, "click", (event) => {
          const point = event.latLng;
          pickRef.current?.({ lat: point.getLat(), lng: point.getLng() });
        });

        const observer = new ResizeObserver(() => map.relayout());
        observer.observe(nodeRef.current);
        mapRef.current._observer = observer;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      mapRef.current?._observer?.disconnect();
      mapRef.current = null;
    };
  }, []);

  // 경로는 프록시를 통해 받아온다. 실패하면 직선 거리로 물러난다.
  useEffect(() => {
    if (places.length < 2) {
      setRoute(null);
      return undefined;
    }
    const controller = new AbortController();
    fetchRoute(places, controller.signal)
      .then((result) => !controller.signal.aborted && setRoute(result))
      .catch(() => {});
    return () => controller.abort();
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!map || !kakao) return;

    overlaysRef.current.forEach((item) => item.setMap(null));
    overlaysRef.current = [];
    lineRef.current?.setMap(null);
    lineRef.current = null;

    if (!places.length) return;

    const style = tripKind(kind);
    const linePath = (route?.coords || places.map((p) => [p.lat, p.lng])).map(
      ([lat, lng]) => new kakao.maps.LatLng(lat, lng)
    );

    if (linePath.length > 1) {
      const line = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 6,
        strokeColor: "#000000",
        strokeOpacity: 0.95,
        strokeStyle: style.id === "walk" ? "shortdot" : style.id === "drive" ? "longdash" : "solid",
      });
      line.setMap(map);
      lineRef.current = line;
    }

    const bounds = new kakao.maps.LatLngBounds();
    places.forEach((place) => {
      const position = new kakao.maps.LatLng(place.lat, place.lng);
      bounds.extend(position);

      const node = document.createElement("div");
      node.className = `map-pin${place.id === selectedPlaceId ? " is-active" : ""}`;
      node.innerHTML = `<span>${place.order}</span>`;
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", `${place.order}번 ${place.name}`);
      node.addEventListener("click", () => selectRef.current?.(place.id));

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: node,
        yAnchor: 1,
        zIndex: place.id === selectedPlaceId ? 10 : 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    if (places.length === 1) {
      map.setCenter(bounds.getSouthWest());
      map.setLevel(4);
      return;
    }
    map.setBounds(bounds, topPadding, 48, bottomPadding, 48);
  }, [places, kind, selectedPlaceId, topPadding, bottomPadding, route]);

  const distance = route?.distance;
  const driveSeconds = route?.duration;

  return (
    <>
      <div className="detail-map" ref={nodeRef} aria-label="여행 경로 지도" />
      {places.length > 1 && distance ? (
        <div className="route-summary" aria-live="polite">
          <strong>{route.source === "road" ? "실제 경로" : "직선 거리"}</strong>
          <span>
            {formatDistance(distance)} · 도보 {formatDuration(distance / WALK_MPS)} · 차량{" "}
            {formatDuration(driveSeconds)}
          </span>
        </div>
      ) : null}
    </>
  );
}
