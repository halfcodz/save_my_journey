/**
 * Loads the Kakao Maps SDK once, on demand.
 *
 * The JavaScript key has to sit in the page — a map SDK draws tiles straight
 * from Kakao, so there is nothing to proxy. Kakao's protection is the domain
 * allowlist in the console, not secrecy, which is why every site using their
 * map ships this key in plain sight.
 */

const KEY = import.meta.env.VITE_KAKAO_JS_KEY;
export const usesKakaoMap = Boolean(KEY);

let loading;

export function loadKakaoMaps() {
  if (!KEY) return Promise.reject(new Error("kakao js key missing"));
  if (window.kakao?.maps?.LatLng) return Promise.resolve(window.kakao);

  loading ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => reject(new Error("kakao sdk failed to load"));
    document.head.appendChild(script);
  });

  return loading;
}

