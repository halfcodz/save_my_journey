/**
 * Road route between the day's stops.
 *
 * Kakao's directions need the REST key, so the request goes through the same
 * proxy the place search uses — the key never reaches this bundle. If the proxy
 * is not configured, OSRM's public demo answers instead, and if both fail we
 * fall back to straight-line distance so the screen still says something true.
 */

const PROXY_URL = import.meta.env.VITE_PLACE_SEARCH_URL;
const OSRM = "https://router.project-osrm.org/route/v1/driving";
const CITY_DRIVE_MPS = (28 * 1000) / 3600;

function straightDistance(places) {
  let total = 0;
  for (let i = 1; i < places.length; i += 1) {
    const a = places[i - 1];
    const b = places[i];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
    const x = dLng * Math.cos(lat);
    total += Math.sqrt(dLat * dLat + x * x) * 6371000;
  }
  return total;
}

async function viaProxy(places, signal) {
  const points = places.map((p) => `${p.lng},${p.lat}`).join("|");
  const response = await fetch(`${PROXY_URL}?mode=route&points=${encodeURIComponent(points)}`, { signal });
  if (!response.ok) throw new Error("proxy route failed");
  const data = await response.json();
  if (!data.distance) throw new Error("route missing");
  return { coords: data.coords || [], distance: data.distance, duration: data.duration, source: "road" };
}

async function viaOsrm(places, signal) {
  const coords = places.map((p) => `${p.lng},${p.lat}`).join(";");
  const response = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson`, { signal });
  if (!response.ok) throw new Error("osrm failed");
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error("route missing");
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
    source: "road",
  };
}

export async function fetchRoute(places, signal) {
  if (places.length < 2) return null;

  if (PROXY_URL) {
    try {
      return await viaProxy(places, signal);
    } catch {
      /* 프록시가 답하지 못하면 OSRM으로 */
    }
  }

  try {
    return await viaOsrm(places, signal);
  } catch {
    const distance = straightDistance(places);
    return { coords: places.map((p) => [p.lat, p.lng]), distance, duration: distance / CITY_DRIVE_MPS, source: "straight" };
  }
}
