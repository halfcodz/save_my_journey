import { lazy } from "react";
import { usesKakaoMap } from "../kakaoLoader.js";

/**
 * Kakao's map when a JavaScript key is configured, OpenStreetMap otherwise, so
 * the app keeps working before the key is in place. This module is the single
 * lazy boundary — importing it again through `lazy()` would nest two of them.
 */
export default lazy(() => (usesKakaoMap ? import("./KakaoRouteMap.jsx") : import("./RouteMap.jsx")));
