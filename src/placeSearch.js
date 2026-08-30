/**
 * Place lookup for the map picker.
 *
 * OpenStreetMap is the only keyless source, and its Korean coverage is uneven —
 * many brands are filed under their English name and some are missing entirely.
 * So a single query is not enough: we fan out a few phrasings, prefer results
 * near the pin, and merge them. If a Kakao REST key is configured we ask Kakao
 * first, because its Korean POI index is what people actually expect.
 */

const KAKAO_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
export const usesKakaoSearch = Boolean(KAKAO_KEY);

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const KAKAO = "https://dapi.kakao.com/v2/local/search/keyword.json";

const dedupe = (results) => {
  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function searchKakao(query, near, signal) {
  const params = new URLSearchParams({ query, size: "10" });
  if (near) {
    params.set("x", String(near.lng));
    params.set("y", String(near.lat));
    params.set("sort", "distance");
  }

  const response = await fetch(`${KAKAO}?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
    signal,
  });
  if (!response.ok) throw new Error("kakao search failed");

  const data = await response.json();
  return (data.documents || []).map((doc) => ({
    id: `kakao-${doc.id}`,
    name: doc.place_name,
    address: doc.road_address_name || doc.address_name,
    lat: Number(doc.y),
    lng: Number(doc.x),
  }));
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

  if (usesKakaoSearch) {
    try {
      const results = await searchKakao(term, near, signal);
      if (results.length) return results;
    } catch {
      /* 카카오가 막히면 OSM으로 계속 진행한다 */
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
