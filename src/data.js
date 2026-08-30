import * as localData from "./db.js";

export const usesFirebaseBackend = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
);

let firebaseBackendPromise;

async function getFirebaseBackend() {
  firebaseBackendPromise ||= import("./firebaseData.js");
  return firebaseBackendPromise;
}

async function backend() {
  return usesFirebaseBackend ? getFirebaseBackend() : localData;
}

export async function getSessionUser() {
  return (await backend()).getSessionUser();
}

export async function signUp(input) {
  return (await backend()).signUp(input);
}

export async function signIn(input) {
  return (await backend()).signIn(input);
}

export async function signOut() {
  return (await backend()).signOut();
}

export async function resetPassword(input) {
  return (await backend()).resetPassword(input);
}

export async function findRecoveryQuestion(email) {
  if (usesFirebaseBackend) return "Firebase가 가입 이메일로 비밀번호 재설정 링크를 보냅니다.";
  return localData.findRecoveryQuestion(email);
}

export async function listTrips() {
  return (await backend()).listTrips();
}

export async function createTrip(title) {
  return (await backend()).createTrip(title);
}

export async function updateTrip(trip) {
  return (await backend()).updateTrip(trip);
}

export async function deleteTrip(tripId) {
  return (await backend()).deleteTrip(tripId);
}

export async function getPlaces(tripId) {
  return (await backend()).getPlaces(tripId);
}

export async function savePlace(placeInput, files = []) {
  const activeBackend = await backend();
  const savedPlace = await activeBackend.savePlace(placeInput, files);
  if (usesFirebaseBackend && files.length) {
    await localData.savePlace(savedPlace, files);
  }
  return savedPlace;
}

export async function deletePlace(placeId, tripId) {
  return (await backend()).deletePlace(placeId, tripId);
}

export async function reorderPlaces(tripId, orderedPlaces) {
  return (await backend()).reorderPlaces(tripId, orderedPlaces);
}

export async function listFeedPosts() {
  if (!usesFirebaseBackend) return localData.listFeedPosts();
  const firebaseData = await getFirebaseBackend();
  const [remotePosts, localPosts] = await Promise.all([firebaseData.listFeedPosts(), localData.listFeedPosts()]);
  const remoteIds = new Set(remotePosts.map((post) => post.id));
  return [...remotePosts, ...localPosts.filter((post) => post.seeded && !remoteIds.has(post.id))].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function publishTripToFeed(input) {
  return (await backend()).publishTripToFeed(input);
}

export const getMediaForTrip = localData.getMediaForTrip;
export const getMediaForPlace = localData.getMediaForPlace;
export const deleteMedia = localData.deleteMedia;

/* Local-only concerns: covers, stats, saves, likes, preferences, backup. */
export const getTripCovers = localData.getTripCovers;
export const getSettings = localData.getSettings;
export const saveSettings = localData.saveSettings;
export const exportBackup = localData.exportBackup;

/**
 * Media never leaves the device, so photo counts are always local. Trip and pin
 * counts follow whichever backend actually owns the trips.
 */
export async function getPlaceCounts() {
  if (!usesFirebaseBackend) return localData.getPlaceCounts();
  const firebaseData = await getFirebaseBackend();
  return firebaseData.getPlaceCounts();
}

export async function getStats({ trips, placeCounts } = {}) {
  const localStats = await localData.getStats();
  if (!usesFirebaseBackend) return localStats;

  // Callers that already hold trips/counts pass them in so a screen load does
  // not read the same Firestore documents twice.
  const [nextTrips, counts] = await Promise.all([
    trips ?? listTrips(),
    placeCounts ?? getPlaceCounts(),
  ]);
  return {
    ...localStats,
    trips: nextTrips.length,
    places: Object.values(counts).reduce((total, count) => total + count, 0),
  };
}

export async function changePassword(input) {
  if (!usesFirebaseBackend) return localData.changePassword(input);
  const firebaseData = await getFirebaseBackend();
  return firebaseData.changePassword(input);
}
