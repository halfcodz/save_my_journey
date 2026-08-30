# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React + Vite PWA, because the user requested this stack and a mobile-first installable browser app.

## Users

Confirmed: one personal user records trips on a mobile browser while traveling, then revisits the route and media later.

Confirmed in later request: the user also wants a social discovery mode similar in spirit to Setlog, where other people's travel courses or date courses can be browsed.

## Product Purpose

Save My Journey lets the user create trips, add visited places in order, attach notes, timestamps, photos, and videos, and replay the trip as a vertical media-first memory sequence.

## Positioning

The app is local-first: trip content, media, and visit order stay in the browser's IndexedDB instead of depending on paid APIs, cloud storage, or metered services.

## Operating Context

Confirmed: the app should work well after being added to Chrome's home screen, with map-based place capture during travel and a reels-style review flow after a trip is complete.

Inferred: the primary environment is a phone held one-handed, often outdoors, with intermittent connectivity. Map tiles need a network connection unless the user later adds a compliant self-hosted/offline tile source.

## Capabilities and Constraints

Confirmed:
- Local account creation, login, automatic login, logout, and password reset.
- A feed where travel courses and date courses can be browsed.
- A way to publish a completed personal route into the feed.
- Create trips and view a trip list.
- Add, edit, delete, and reorder places inside one trip.
- Show places as ordered pins on a map.
- Store place name, memo, date/time, coordinates, photos, and videos.
- Select a map pin to inspect its place record.
- Show the whole trip as a vertical, swipe/scroll reels-style review ordered by visit sequence.
- Use only free-for-personal-use technologies with no paid API key, credit-card requirement, trial-to-paid flow, or overage billing.

Technical constraints:
- Without a hosted backend, login and feed data are local-only. They work as an MVP pattern, not as real cross-device authentication or public social sharing.
- Use OpenStreetMap tiles through Leaflet with attribution and no bulk/offline tile downloading.
- Store user media locally in IndexedDB; no external media storage.
- PWA shell must include install metadata and offline app shell caching, while map tiles remain subject to tile-provider availability and policy.

## Brand Commitments

Confirmed name for this repository/product: Save My Journey.

Voice: Korean-first, short, practical labels for mobile use.

## Evidence on Hand

No real trip data, photos, videos, logo, or brand assets were supplied. Demo content must be clearly synthetic or omitted from persisted storage.

## Product Principles

- Local-first by default: the user's private travel media should not leave the device.
- Mobile recording speed matters more than desktop density.
- The map and ordered place list must stay connected so route context is never lost.
- Completion should feel like a memory playback, not a database export.
- Free-service compliance is a feature requirement, not an implementation detail.

## Accessibility & Inclusion

The MVP should remain usable with keyboard focus, semantic controls, readable Korean copy, adequate contrast, and reduced-motion preferences.
