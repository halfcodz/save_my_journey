/**
 * A course is a trip, a drive, or a walk. The difference is deliberately small:
 * a label, and how the route is drawn — solid for a trip, long dashes for a
 * drive, round dots for a walk.
 */
export const TRIP_KINDS = [
  { id: "travel", label: "여행 코스", short: "여행", dash: null, weight: 3.6 },
  { id: "drive", label: "드라이브 코스", short: "드라이브", dash: "14 7", weight: 3.8 },
  { id: "walk", label: "산책 코스", short: "산책", dash: "1 7", weight: 4.2 },
];

export const tripKind = (kind) => TRIP_KINDS.find((item) => item.id === kind) || TRIP_KINDS[0];
