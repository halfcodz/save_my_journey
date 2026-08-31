/**
 * Place search proxy — Cloudflare Worker.
 *
 * The Kakao key lives here as a secret and never reaches the browser. The app
 * calls this Worker, the Worker calls Kakao, and only the results come back.
 * Requests from anywhere but the allowed origins are refused so the quota is
 * not open to the internet.
 *
 * Deploy: see worker/README.md
 */

const ALLOWED_ORIGINS = [
  "https://halfcodz.github.io",
  "http://localhost:5173",
  "http://localhost:4173",
];

const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

/** Kakao Mobility 자동차 길찾기. 좌표는 "lng,lat|lng,lat|..." 형식. */
async function handleRoute(url, env, origin) {
  const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };
  const points = (url.searchParams.get("points") || "").split("|").filter(Boolean);
  if (points.length < 2) return new Response(JSON.stringify({ error: "need two points" }), { status: 400, headers });

  const params = new URLSearchParams({
    origin: points[0],
    destination: points[points.length - 1],
    priority: "RECOMMEND",
  });
  const waypoints = points.slice(1, -1);
  if (waypoints.length) params.set("waypoints", waypoints.slice(0, 30).join("|"));

  const upstream = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${params}`, {
    headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` },
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: "route upstream failed", status: upstream.status, detail: detail.slice(0, 300) }), {
      status: 502,
      headers,
    });
  }

  const data = await upstream.json();
  const route = data.routes?.[0];
  if (!route || route.result_code !== 0) {
    return new Response(JSON.stringify({ error: "no route", detail: route?.result_msg || "" }), { status: 502, headers });
  }

  // 안내 구간의 좌표를 이어 선 하나로 만든다.
  const coords = [];
  (route.sections || []).forEach((section) => {
    (section.roads || []).forEach((road) => {
      for (let i = 0; i + 1 < road.vertexes.length; i += 2) {
        coords.push([road.vertexes[i + 1], road.vertexes[i]]);
      }
    });
  });

  return new Response(
    JSON.stringify({ coords, distance: route.summary?.distance, duration: route.summary?.duration }),
    { headers: { ...headers, "Cache-Control": "public, max-age=300" } }
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? corsHeaders(origin) : {} });
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: "origin not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);

    // 길찾기도 같은 키를 쓰므로 같은 프록시에서 처리한다.
    if (url.searchParams.get("mode") === "route") {
      return handleRoute(url, env, origin);
    }

    const query = (url.searchParams.get("q") || "").trim();
    if (!query) {
      return new Response(JSON.stringify({ places: [] }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    // 좌표를 주면 카카오가 그 근처를 우선하되 전국을 뒤진다. radius를 걸면
    // 그 반경 밖은 아예 없는 셈이 되어, 서울에서 제주 카페를 못 찾는다.
    const ask = async (withPoint) => {
      const params = new URLSearchParams({ query, size: "15" });
      if (withPoint && lat && lng) {
        params.set("x", lng);
        params.set("y", lat);
      }
      const response = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
        headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` },
      });
      if (!response.ok) throw new Error(`kakao ${response.status}: ${(await response.text()).slice(0, 200)}`);
      return (await response.json()).documents || [];
    };

    let documents;
    try {
      documents = await ask(true);
      if (!documents.length && lat && lng) documents = await ask(false);
    } catch (error) {
      return new Response(JSON.stringify({ error: "upstream failed", detail: String(error).slice(0, 300) }), {
        status: 502,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const places = documents.map((doc) => ({
      id: `kakao-${doc.id}`,
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      category: doc.category_group_name || "",
      lat: Number(doc.y),
      lng: Number(doc.x),
    }));

    return new Response(JSON.stringify({ places }), {
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
};
