import { useEffect, useRef, useState } from "react";
import { tripKind } from "../tripKinds.js";
import L from "leaflet";

const DEFAULT_CENTER = [37.5665, 126.978];
const WALK_MPS = 4.5 * 1000 / 3600;
const CITY_DRIVE_MPS = 28 * 1000 / 3600;

const tileLayer = () =>
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
    crossOrigin: true,
  });

export const numberPin = (order, active) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div class="pin${active ? " is-active" : ""}">${String(order)}</div>`,
  });

const toRad = (value) => (value * Math.PI) / 180;

function segmentMeters(a, b) {
  const earth = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function straightDistance(places) {
  return places.reduce((total, place, index) => {
    if (!index) return total;
    return total + segmentMeters(places[index - 1], place);
  }, 0);
}

function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return "0m";
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)}km`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0분";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

async function fetchOsrmRoute(profile, places, signal) {
  const coords = places.map((place) => `${place.lng},${place.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("route failed");
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error("route missing");
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
  };
}

/**
 * The trip route: numbered pins joined by a road-following line. `bottomPadding`
 * keeps the fitted bounds clear of the place sheet that overlaps the map.
 */
export default function RouteMap({ places, kind, selectedPlaceId, onSelectPlace, onPickPoint, bottomPadding = 150 }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const pickRef = useRef(onPickPoint);
  const selectRef = useRef(onSelectPlace);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    pickRef.current = onPickPoint;
    selectRef.current = onSelectPlace;
  });

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return undefined;

    const map = L.map(nodeRef.current, { zoomControl: false }).setView(DEFAULT_CENTER, 13);
    tileLayer().addTo(map);
    map.on("click", (event) => pickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng }));

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(nodeRef.current);

    return () => {
      observer.disconnect();
      map.off();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (places.length < 2) {
      setRouteInfo(null);
      return undefined;
    }

    const controller = new AbortController();
    const fallbackDistance = straightDistance(places);
    setRouteInfo({
      coords: places.map((place) => [place.lat, place.lng]),
      distance: fallbackDistance,
      walkSeconds: fallbackDistance / WALK_MPS,
      driveSeconds: fallbackDistance / CITY_DRIVE_MPS,
      source: "straight",
      loading: true,
    });

    (async () => {
      const settled = await Promise.allSettled([fetchOsrmRoute("driving", places, controller.signal)]);
      if (controller.signal.aborted) return;

      const route = settled[0].status === "fulfilled" ? settled[0].value : null;
      const distance = route?.distance || fallbackDistance;

      setRouteInfo({
        coords: route?.coords || places.map((place) => [place.lat, place.lng]),
        distance,
        walkSeconds: distance / WALK_MPS,
        driveSeconds: route?.duration || distance / CITY_DRIVE_MPS,
        source: route ? "road" : "straight",
        loading: false,
      });
    })().catch(() => {
      if (!controller.signal.aborted) {
        setRouteInfo((current) => (current ? { ...current, loading: false } : current));
      }
    });

    return () => controller.abort();
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points = places.map((place) => [place.lat, place.lng]);
    const routePoints = routeInfo?.coords?.length ? routeInfo.coords : points;

    if (routePoints.length > 1) {
      const style = tripKind(kind);
      L.polyline(routePoints, { color: "#fff", weight: 8, opacity: 0.88, lineCap: "round", lineJoin: "round" }).addTo(layer);
      L.polyline(routePoints, {
        color: "#000",
        weight: style.weight,
        opacity: 0.96,
        lineCap: "round",
        lineJoin: "round",
        dashArray: style.dash,
      }).addTo(layer);
    }

    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: numberPin(String(place.order), place.id === selectedPlaceId),
        keyboard: true,
        alt: `${place.order}번 ${place.name}`,
      });
      marker.on("click", () => selectRef.current?.(place.id));
      marker.addTo(layer);
    });

    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: false });
      return;
    }
    map.fitBounds(points, {
      paddingTopLeft: [48, 96],
      paddingBottomRight: [48, bottomPadding],
      maxZoom: 16,
      animate: false,
    });
  }, [places, kind, selectedPlaceId, bottomPadding, routeInfo]);

  useEffect(() => {
    const map = mapRef.current;
    const place = places.find((item) => item.id === selectedPlaceId);
    if (!map || !place) return;
    map.panTo([place.lat, place.lng], { animate: true, duration: 0.35 });
  }, [selectedPlaceId, places]);

  return (
    <>
      <div className="detail-map" ref={nodeRef} aria-label="여행 경로 지도" />
      {routeInfo ? (
        <div className="route-summary" aria-live="polite">
          <strong>{routeInfo.source === "road" ? "최단 경로 예상" : "직선 거리 예상"}</strong>
          <span>
            {formatDistance(routeInfo.distance)} · 도보 {formatDuration(routeInfo.walkSeconds)} · 차량{" "}
            {formatDuration(routeInfo.driveSeconds)}
            {routeInfo.loading ? " · 계산 중" : ""}
          </span>
        </div>
      ) : null}
    </>
  );
}
