import { useEffect, useRef } from "react";
import L from "leaflet";
import { numberPin } from "./RouteMap.jsx";

const DEFAULT_CENTER = [37.5665, 126.978];

/**
 * The 148px map in the place editor. The pin is draggable and the map is
 * tappable, which is the "핀을 끌어 조정" affordance from the design.
 */
export default function PinPicker({ point, order, onChange }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const changeRef = useRef(onChange);

  useEffect(() => {
    changeRef.current = onChange;
  });

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return undefined;

    const center = point ? [point.lat, point.lng] : DEFAULT_CENTER;
    const map = L.map(nodeRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(center, point ? 16 : 12);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
      crossOrigin: true,
    }).addTo(map);

    const marker = L.marker(center, { icon: numberPin(order, true), draggable: true });
    marker.addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      changeRef.current?.({ lat, lng });
    });

    map.on("click", (event) => {
      marker.setLatLng(event.latlng);
      changeRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;

    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(nodeRef.current);

    return () => {
      observer.disconnect();
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(numberPin(order, true));
  }, [order]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !point) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - point.lat) < 1e-9 && Math.abs(current.lng - point.lng) < 1e-9) return;
    marker.setLatLng([point.lat, point.lng]);
    map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16), { animate: false });
  }, [point]);

  return <div className="mini-map" ref={nodeRef} aria-label="장소 위치 지도" />;
}
