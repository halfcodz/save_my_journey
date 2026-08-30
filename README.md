# Save My Journey

React + Vite 기반의 개인용 여행 기록 PWA입니다. 지도는 OpenStreetMap 표준 타일과 Leaflet을 사용하고, 여행/장소/사진/동영상 데이터는 외부 스토리지 없이 브라우저 IndexedDB에 저장합니다.

Firebase 환경변수를 설정하면 Firebase Authentication과 Cloud Firestore를 사용해 실제 로그인과 공유 피드를 사용할 수 있습니다. 환경변수가 없으면 기존 로컬 MVP로 자동 fallback됩니다.

## 기능

- 여행 생성과 여행 목록
- 회원가입, 로그인, 자동 로그인, 로그아웃
- Firebase 사용 시 이메일 기반 비밀번호 재설정
- Firebase 미설정 시 복구 질문 기반 로컬 비밀번호 재설정
- 여행코스/데이트코스를 둘러보는 피드
- 내 여행 코스를 피드에 게시
- 여행별 지도 핀 표시
- 장소 추가, 수정, 삭제
- 방문 순서 관리
- 장소명, 메모, 날짜/시간, 좌표 저장
- 사진/동영상 첨부와 로컬 IndexedDB 저장
- 지도 핀 선택 시 장소 기록 확인
- 방문 순서대로 넘겨보는 세로 릴스 화면
- Chrome 홈 화면 추가용 PWA 매니페스트와 서비스 워커

## 무료 기술 조건

- 지도 UI: `leaflet` BSD-2-Clause
- 지도 타일: OpenStreetMap 표준 타일, 개인용 소규모 사용 기준. 앱은 타일을 선다운로드하거나 오프라인 보관하지 않습니다.
- 데이터 저장: 브라우저 IndexedDB via `idb` ISC
- UI 아이콘: `lucide-react` ISC
- 앱/빌드: React, Vite, Vite React plugin MIT
- 배포: GitHub Pages용 워크플로 포함. 공개 저장소의 GitHub Free에서 Pages 사용 가능

주의: IndexedDB 데이터는 같은 기기, 같은 브라우저 프로필에 저장됩니다. 브라우저 데이터 삭제, 시크릿 모드, 저장공간 정리 정책에 따라 사라질 수 있습니다.

Firebase 미설정 상태의 로그인과 피드는 무료 조건을 유지하기 위한 로컬 MVP입니다. 즉, 계정/게시글은 같은 브라우저 안에서만 동작합니다. Firebase 환경변수를 넣으면 Auth와 Firestore를 사용해 다른 사용자가 올린 코스를 공유할 수 있습니다.

사진/동영상 원본은 현재 IndexedDB에 저장됩니다. Firestore 문서 크기 제한과 무료 사용량을 고려해, 공유 피드에는 코스 텍스트와 장소 순서만 게시합니다.

## 실행

```bash
npm install
npm run dev
```

로컬 주소는 기본적으로 `http://localhost:5173/`입니다.

## VS Code Live Server로 보기

Live Server는 Vite의 JSX/React 변환을 수행하지 않기 때문에 원본 앱을 직접 실행할 수 없습니다. 대신 먼저 빌드한 뒤 루트 `index.html`을 Live Server로 열면 `dist/index.html`로 자동 이동합니다.

```bash
npm run build
```

## 빌드

```bash
npm run build
```

정적 산출물은 `dist/`에 생성됩니다.

## GitHub Pages 배포

이 저장소를 GitHub에 올리고, Settings > Pages에서 Source를 GitHub Actions로 선택하면 `.github/workflows/deploy.yml`이 `main` 브랜치 push 때마다 배포합니다.

저장소 이름이 `username.github.io`처럼 루트 Pages 사이트인 경우 워크플로의 `VITE_BASE_PATH`를 `/`로 바꾸세요.

## Firebase 설정

1. Firebase Console에서 새 프로젝트를 만들고 Spark 플랜을 유지합니다.
2. Authentication > Sign-in method에서 Email/Password를 활성화합니다.
3. Firestore Database를 만들고 시작 모드는 Production mode를 선택합니다.
4. Project settings > General > Your apps에서 Web app을 추가합니다.
5. Firebase config 값을 `.env`에 넣습니다. 형식은 `.env.example`을 참고하세요.
6. 로컬에서 `npm run dev`를 다시 실행합니다.
7. GitHub Pages 배포용으로 GitHub repository Settings > Secrets and variables > Actions > Variables에 `VITE_FIREBASE_*` 값을 똑같이 등록합니다.
8. Firebase CLI를 쓰는 경우 `firebase deploy --only firestore:rules`로 `firestore.rules`를 배포합니다.

Spark 플랜에서는 Firestore 무료 할당량을 넘으면 추가 과금 대신 요청이 실패합니다. 과금 방지를 위해 Blaze 플랜으로 업그레이드하지 않는 구성을 권장합니다.
