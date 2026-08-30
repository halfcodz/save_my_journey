/**
 * Place lookup for the map picker.
 *
 * OpenStreetMap is the only keyless source, and its Korean coverage is uneven —
 * many brands are filed under their English name and some are missing entirely.
 * So a single query is not enough: we fan out a few phrasings, prefer results
 * near the pin, and merge them.
 *
 * When a search proxy is configured we ask it first: it holds a Kakao key that
 * this bundle never sees, and returns only results. Nothing here can leak it.
 */

// 검색 키는 브라우저에 두지 않는다. 프록시 주소만 알고, 키는 그쪽에만 있다.
const PROXY_URL = import.meta.env.VITE_PLACE_SEARCH_URL;
export const usesProxySearch = Boolean(PROXY_URL);

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const dedupe = (results) => {
  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function searchViaProxy(query, near, signal) {
  const params = new URLSearchParams({ q: query });
  if (near) {
    params.set("lat", String(near.lat));
    params.set("lng", String(near.lng));
  }

  const response = await fetch(`${PROXY_URL}?${params}`, { signal });
  if (!response.ok) throw new Error("proxy search failed");

  const data = await response.json();
  return Array.isArray(data.places) ? data.places : [];
}

async function searchNominatim(query, { near, bounded, signal }) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    "accept-language": "ko",
    countrycodes: "kr",
  });

  if (near) {
    const span = bounded ? 0.09 : 0.5;
    params.set("viewbox", [near.lng - span, near.lat + span, near.lng + span, near.lat - span].join(","));
    params.set("bounded", bounded ? "1" : "0");
  }

  const response = await fetch(`${NOMINATIM}?${params}`, { signal });
  if (!response.ok) throw new Error("nominatim search failed");

  const data = await response.json();
  return data.map((item) => ({
    id: `osm-${item.place_id}`,
    name: item.name || item.display_name.split(",")[0].trim(),
    address: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

/**
 * @param {string} query    what the person typed
 * @param {{lat:number,lng:number}|null} near  the pin, used to rank by distance
 */
export async function searchPlaces(query, near, signal) {
  const term = query.trim();
  if (!term) return [];

  if (usesProxySearch) {
    try {
      const results = await searchViaProxy(term, near, signal);
      if (results.length) return results;
    } catch {
      /* 프록시가 막히면 OSM으로 계속 진행한다 */
    }
  }

  // 가까운 곳 우선 → 넓게 → 상호만. 브랜드가 영문으로만 등록된 경우가 많아
  // 지역어를 뗀 첫 토큰으로 한 번 더 물어본다.
  const firstToken = term.split(/\s+/)[0];
  const attempts = [
    searchNominatim(term, { near, bounded: true, signal }),
    searchNominatim(term, { near, bounded: false, signal }),
  ];
  if (firstToken && firstToken !== term) {
    attempts.push(searchNominatim(firstToken, { near, bounded: true, signal }));
  }

  const settled = await Promise.allSettled(attempts);
  const merged = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (!merged.length) return [];

  const ranked = near
    ? dedupe(merged).sort(
        (a, b) =>
          (a.lat - near.lat) ** 2 + (a.lng - near.lng) ** 2 - ((b.lat - near.lat) ** 2 + (b.lng - near.lng) ** 2)
      )
    : dedupe(merged);

  return ranked.slice(0, 8);
}
