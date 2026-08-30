import React from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App.jsx";

/**
 * Registers the service worker and reports when a newer build is sitting in the
 * wings, so the app can offer a one-tap update instead of asking people to
 * guess that a hard refresh is needed.
 */
function registerServiceWorker(onUpdateReady) {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);

      const notifyIfWaiting = () => {
        if (registration.waiting && navigator.serviceWorker.controller) onUpdateReady(registration);
      };

      notifyIfWaiting();
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed") notifyIfWaiting();
        });
      });

      // 앱으로 돌아올 때마다 새 배포가 있는지 확인한다.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    } catch {
      /* 서비스워커가 없어도 앱은 그대로 동작한다 */
    }
  });
}

let reloading = false;
navigator.serviceWorker?.addEventListener("controllerchange", () => {
  if (reloading) return;
  reloading = true;
  window.location.reload();
});

const root = createRoot(document.getElementById("root"));

function start(updateRegistration) {
  root.render(
    <React.StrictMode>
      <App
        updateReady={Boolean(updateRegistration)}
        onApplyUpdate={() => {
          if (updateRegistration?.waiting) {
            updateRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
            return;
          }
          window.location.reload();
        }}
      />
    </React.StrictMode>
  );
}

start(null);
registerServiceWorker((registration) => start(registration));
