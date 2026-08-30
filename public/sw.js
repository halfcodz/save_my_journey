// __BUILD_ID__ is rewritten at build time so every deploy gets its own cache
// and the browser sees a changed script, which is what triggers an update.
const BUILD_ID = "__BUILD_ID__";
const CACHE_NAME = `save-my-journey-${BUILD_ID}`;
const SHELL_URL = new URL("index.html", self.registration.scope).toString();

self.addEventListener("install", (event) => {
  // 새 워커는 대기 상태로 둔다. 사용자가 '새로고침'을 누를 때 교체된다.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL)).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 지도 타일·폰트·API는 건드리지 않는다

  // 문서는 항상 네트워크 우선. 새 배포를 즉시 집어올 수 있어야 한다.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL_URL))
    );
    return;
  }

  // 해시가 붙은 빌드 산출물만 캐시 우선. 파일명이 바뀌면 자연히 새로 받는다.
  const isHashedAsset = url.pathname.includes("/assets/");
  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // 나머지(manifest, 아이콘)는 네트워크 우선 + 캐시 폴백.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
