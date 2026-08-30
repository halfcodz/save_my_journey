# 장소 검색 프록시

카카오 키를 브라우저에 노출하지 않기 위한 중계 서버입니다. 키는 이 Worker의
비밀값으로만 존재하고, 앱 코드에는 들어가지 않습니다.

## 배포

```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

## 키 넣기

```bash
wrangler secret put KAKAO_REST_KEY
```

프롬프트가 뜨면 카카오 REST API 키를 붙여넣습니다. 이 값은 Cloudflare에만
저장되고 코드에도, 앱 번들에도 남지 않습니다.

## 앱에 주소 알려주기

배포하면 `https://<이름>.<계정>.workers.dev` 주소가 나옵니다. 이 주소를
`VITE_PLACE_SEARCH_URL`로 넣습니다. 주소 자체는 공개되어도 무방합니다 —
허용된 도메인에서 온 요청만 처리합니다.
