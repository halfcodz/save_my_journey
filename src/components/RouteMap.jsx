import { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [37.5665, 126.978];

const tileLayer = () =>
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
    crossOrigin: true,
  });

export const numberPin = (order, active) =>
  L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div class="pin${active ? " is-active" : ""}">${String(order)}</div>`,
  });

/**
 * The trip route: numbered pins joined by a dashed hairline. `bottomPadding`
 * keeps the fitted bounds clear of the place sheet that overlaps the map.
 */
export default function RouteMap({ places, selectedPlaceId, onSelectPlace, onPickPoint, bottomPadding = 150 }) {
  const nodeRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const pickRef = useRef(onPickPoint);
  const selectRef = useRef(onSelectPlace);

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
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const points = places.map((place) => [place.lat, place.lng]);

    if (points.length > 1) {
      L.polyline(points, { color: "#000", weight: 1.5, opacity: 0.5, dashArray: "3 5" }).addTo(layer);
    }

    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: numberPin(place.order, place.id === selectedPlaceId),
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
  }, [places, selectedPlaceId, bottomPadding]);

  useEffect(() => {
    const map = mapRef.current;
    const place = places.find((item) => item.id === selectedPlaceId);
    if (!map || !place) return;
    map.panTo([place.lat, place.lng], { animate: true, duration: 0.35 });
  }, [selectedPlaceId, places]);

  return <div className="detail-map" ref={nodeRef} aria-label="여행 경로 지도" />;
}
