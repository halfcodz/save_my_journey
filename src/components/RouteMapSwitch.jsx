import { Suspense, lazy, useEffect, useState } from "react";
import { loadKakaoMaps, usesKakaoMap } from "../kakaoLoader.js";

const KakaoRouteMap = lazy(() => import("./KakaoRouteMap.jsx"));
const OpenRouteMap = lazy(() => import("./RouteMap.jsx"));

/**
 * Kakao's map when its SDK actually loads, OpenStreetMap otherwise.
 *
 * The SDK is refused unless the site's domain is registered in the Kakao
 * console, and a console misconfiguration should not leave a dead panel where
 * the map belongs — so we probe once and quietly fall back.
 */
export default function RouteMapSwitch(props) {
  const [useKakao, setUseKakao] = useState(usesKakaoMap);

  useEffect(() => {
    if (!usesKakaoMap) return;
    let cancelled = false;
    loadKakaoMaps().catch(() => !cancelled && setUseKakao(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const Map = useKakao ? KakaoRouteMap : OpenRouteMap;

  return (
    <Suspense fallback={<div className="detail-map map-fallback">지도를 여는 중</div>}>
      <Map {...props} />
    </Suspense>
  );
}
