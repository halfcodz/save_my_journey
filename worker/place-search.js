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
    const query = (url.searchParams.get("q") || "").trim();
    if (!query) {
      return new Response(JSON.stringify({ places: [] }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({ query, size: "10" });
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    if (lat && lng) {
      params.set("x", lng);
      params.set("y", lat);
      params.set("radius", "20000");
      params.set("sort", "distance");
    }

    const upstream = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: { Authorization: `KakaoAK ${env.KAKAO_REST_KEY}` },
    });

    if (!upstream.ok) {
      // 카카오가 왜 거절했는지 그대로 넘겨 진단할 수 있게 한다. 키는 포함되지 않는다.
      const detail = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: "upstream failed", status: upstream.status, detail: detail.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const data = await upstream.json();
    const places = (data.documents || []).map((doc) => ({
      id: `kakao-${doc.id}`,
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
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
