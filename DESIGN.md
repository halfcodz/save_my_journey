# Design

<!-- impeccable:design-schema 1 -->

## Product Surface

The primary surface is a mobile-first operating app for recording a trip in the moment. It opens directly into task UI, not a landing page.

## Visual World

핵심만 — 기록 · 지도 · 검색 (design canvas 3A). The interface itself is pure black on white with a five-step neutral ramp for hierarchy; emphasis comes from weight, scale, and space rather than hue. Pretendard Variable carries the whole type system, headlines run 800 weight with tight negative tracking, and meta lines are 10.5–11px eyebrows at 0.1em letter-spacing. Map tiles keep their real colour — terrain, water, and parks are information, not decoration — so the monochrome chrome frames a legible map rather than flattening it.

## Layout

The app is a phone-width column. A floating black pill hovers over the content with five slots — 홈, 탐색, a raised white ＋ action, 여행 기록, 프로필. 홈 is a readable personal archive overview with total counts, the latest trip, and recent stops. 여행 기록 owns the full trip library and creation flow. 탐색 owns published courses only; seeded example courses are omitted. The trip detail is a full-bleed map with floating controls, a route summary, and a bottom sheet that can be pulled up over it. Place capture, reorder, and reels each take the full screen.

## Components

- Visit order reads as rounds — 1차, 2차, 3차 — on 34px pins, sheet rows, and playback alike.
- The floating tab pill uses icons only; every slot is a destination.
- Auth is bottom-weighted: a 44px headline over underline fields, 자동 로그인, and stacked pill buttons.
- Trip rows use 64px rounded thumbnails; the newest in-progress trip gets a full 190px cover.
- The place sheet opens straight onto stops as 52px thumbnail rows; the selected row shows a dot and a 수정 affordance.
- Reorder lifts the dragged row out of flow as a black card over a dashed slot.
- Place capture leads with 어디였나요, then photos, then 그때의 감정 set larger than any other field — the feeling is the record.
- Playback uses full-height scroll snapping and story-style progress segments.
- Settings are hairline rows with pill toggles — no cards. A single 피드에 코스 공개 switch governs sharing; there is no second switch that contradicts it.

## Motion

Motion is restrained but continuous: the tab track follows the finger 1:1 and settles on release, the sheet and menu rise from the bottom, and the ＋ action has brief scale feedback. A vertical drag never steals the horizontal gesture, and the track resists at the first and last screen instead of tearing free. Reduced-motion users get the page change without the slide.

## Accessibility

Controls are semantic buttons with explicit labels; buttons contain only phrasing content. Focus states use a 2px black outline with offset. Reorder rows respond to arrow keys, and the tab bar reaches every screen the swipe does, so nothing depends on a gesture. Off-screen tab panes are inert. Body copy holds high contrast against white, and the tab pill's inactive icons sit at 45% white on black.

## Constraints

No paid APIs, hosted media storage, metered map SDKs, or tile bulk-download behavior are part of the design. Map tiles are served in their original colour from OpenStreetMap with attribution and are intentionally not cached by the service worker. Photos and videos stay in IndexedDB on the device even when a Firebase backend is configured.
