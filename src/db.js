import { openDB } from "idb";

const DB_NAME = "save-my-journey";
const DB_VERSION = 3;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("trips")) {
      const trips = db.createObjectStore("trips", { keyPath: "id" });
      trips.createIndex("updatedAt", "updatedAt");
    }

    if (!db.objectStoreNames.contains("places")) {
      const places = db.createObjectStore("places", { keyPath: "id" });
      places.createIndex("tripId", "tripId");
    }

    if (!db.objectStoreNames.contains("media")) {
      const media = db.createObjectStore("media", { keyPath: "id" });
      media.createIndex("placeId", "placeId");
      media.createIndex("tripId", "tripId");
    }

    if (!db.objectStoreNames.contains("users")) {
      const users = db.createObjectStore("users", { keyPath: "id" });
      users.createIndex("email", "email", { unique: true });
    }

    if (!db.objectStoreNames.contains("session")) {
      db.createObjectStore("session", { keyPath: "id" });
    }

    if (!db.objectStoreNames.contains("feedPosts")) {
      const feedPosts = db.createObjectStore("feedPosts", { keyPath: "id" });
      feedPosts.createIndex("createdAt", "createdAt");
      feedPosts.createIndex("authorId", "authorId");
    }

    if (!db.objectStoreNames.contains("saved")) {
      db.createObjectStore("saved", { keyPath: "id" });
    }

    if (!db.objectStoreNames.contains("likes")) {
      db.createObjectStore("likes", { keyPath: "id" });
    }

    if (!db.objectStoreNames.contains("settings")) {
      db.createObjectStore("settings", { keyPath: "id" });
    }
  },
});

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const normalizeEmail = (email) => email.trim().toLowerCase();

async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password, salt = uid()) {
  return {
    salt,
    passwordHash: await digest(`${salt}:${password}`),
  };
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, salt, recoveryAnswerHash, recoverySalt, ...safeUser } = user;
  return safeUser;
}

export async function getSessionUser() {
  const db = await dbPromise;
  const session = await db.get("session", "current");
  if (!session?.userId) return null;
  const user = await db.get("users", session.userId);
  return publicUser(user);
}

export async function signUp({ name, email, password, recoveryQuestion, recoveryAnswer }) {
  const db = await dbPromise;
  const normalizedEmail = normalizeEmail(email);
  const existing = await db.getFromIndex("users", "email", normalizedEmail);
  if (existing) throw new Error("이미 가입된 이메일입니다.");

  const passwordParts = await hashPassword(password);
  const recoveryParts = await hashPassword(recoveryAnswer.trim().toLowerCase());
  const timestamp = now();
  const user = {
    id: uid(),
    name: name.trim() || "여행자",
    email: normalizedEmail,
    passwordHash: passwordParts.passwordHash,
    salt: passwordParts.salt,
    recoveryQuestion: recoveryQuestion.trim() || "가장 기억나는 여행지는?",
    recoveryAnswerHash: recoveryParts.passwordHash,
    recoverySalt: recoveryParts.salt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const tx = db.transaction(["users", "session"], "readwrite");
  await tx.objectStore("users").put(user);
  await tx.objectStore("session").put({ id: "current", userId: user.id, updatedAt: timestamp });
  await tx.done;
  return publicUser(user);
}

export async function signIn({ email, password }) {
  const db = await dbPromise;
  const user = await db.getFromIndex("users", "email", normalizeEmail(email));
  if (!user) throw new Error("가입된 계정을 찾을 수 없습니다.");

  const { passwordHash } = await hashPassword(password, user.salt);
  if (passwordHash !== user.passwordHash) throw new Error("비밀번호가 맞지 않습니다.");

  await db.put("session", { id: "current", userId: user.id, updatedAt: now() });
  return publicUser(user);
}

export async function signOut() {
  const db = await dbPromise;
  await db.delete("session", "current");
}

export async function findRecoveryQuestion(email) {
  const db = await dbPromise;
  const user = await db.getFromIndex("users", "email", normalizeEmail(email));
  if (!user) throw new Error("가입된 계정을 찾을 수 없습니다.");
  return user.recoveryQuestion;
}

export async function resetPassword({ email, recoveryAnswer, nextPassword }) {
  const db = await dbPromise;
  const user = await db.getFromIndex("users", "email", normalizeEmail(email));
  if (!user) throw new Error("가입된 계정을 찾을 수 없습니다.");

  const { passwordHash: answerHash } = await hashPassword(recoveryAnswer.trim().toLowerCase(), user.recoverySalt);
  if (answerHash !== user.recoveryAnswerHash) throw new Error("복구 답변이 맞지 않습니다.");

  const passwordParts = await hashPassword(nextPassword);
  const updated = {
    ...user,
    passwordHash: passwordParts.passwordHash,
    salt: passwordParts.salt,
    updatedAt: now(),
  };
  await db.put("users", updated);
  return publicUser(updated);
}

export async function listTrips() {
  const db = await dbPromise;
  const trips = await db.getAllFromIndex("trips", "updatedAt");
  return trips.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createTrip(title) {
  const timestamp = now();
  const trip = {
    id: uid(),
    title: title.trim() || `새 여행 ${new Date().toLocaleDateString("ko-KR")}`,
    status: "active",
    visibility: "private",
    createdAt: timestamp,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
  const db = await dbPromise;
  await db.put("trips", trip);
  return trip;
}

export async function updateTrip(trip) {
  const db = await dbPromise;
  const next = { ...trip, updatedAt: now() };
  await db.put("trips", next);
  return next;
}

export async function deleteTrip(tripId) {
  const db = await dbPromise;
  const tx = db.transaction(["trips", "places", "media"], "readwrite");
  const places = await tx.objectStore("places").index("tripId").getAll(tripId);
  const media = await tx.objectStore("media").index("tripId").getAll(tripId);
  await Promise.all([
    tx.objectStore("trips").delete(tripId),
    ...places.map((place) => tx.objectStore("places").delete(place.id)),
    ...media.map((item) => tx.objectStore("media").delete(item.id)),
  ]);
  await tx.done;
}

export async function getPlaces(tripId) {
  const db = await dbPromise;
  const places = await db.getAllFromIndex("places", "tripId", tripId);
  return places.sort((a, b) => a.order - b.order);
}

export async function savePlace(placeInput, files = []) {
  const db = await dbPromise;
  const tx = db.transaction(["trips", "places", "media"], "readwrite");
  const timestamp = now();
  const existing = placeInput.id ? await tx.objectStore("places").get(placeInput.id) : null;
  const place = {
    ...existing,
    ...placeInput,
    id: placeInput.id || uid(),
    updatedAt: timestamp,
    createdAt: existing?.createdAt || timestamp,
  };

  const newMedia = files.map((file) => ({
    id: uid(),
    tripId: place.tripId,
    placeId: place.id,
    type: file.type.startsWith("video/") ? "video" : "image",
    mime: file.type,
    name: file.name,
    size: file.size,
    blob: file,
    createdAt: timestamp,
  }));

  await tx.objectStore("places").put(place);
  await Promise.all(newMedia.map((item) => tx.objectStore("media").put(item)));
  const trip = await tx.objectStore("trips").get(place.tripId);
  if (trip) await tx.objectStore("trips").put({ ...trip, updatedAt: timestamp });
  await tx.done;
  return place;
}

export async function deletePlace(placeId) {
  const db = await dbPromise;
  const tx = db.transaction(["trips", "places", "media"], "readwrite");
  const place = await tx.objectStore("places").get(placeId);
  const media = await tx.objectStore("media").index("placeId").getAll(placeId);
  await Promise.all([
    tx.objectStore("places").delete(placeId),
    ...media.map((item) => tx.objectStore("media").delete(item.id)),
  ]);
  if (place) {
    const trip = await tx.objectStore("trips").get(place.tripId);
    if (trip) await tx.objectStore("trips").put({ ...trip, updatedAt: now() });
  }
  await tx.done;
}

export async function reorderPlaces(tripId, orderedPlaces) {
  const db = await dbPromise;
  const timestamp = now();
  const tx = db.transaction(["trips", "places"], "readwrite");
  await Promise.all(
    orderedPlaces.map((place, index) => tx.objectStore("places").put({ ...place, order: index + 1, updatedAt: timestamp }))
  );
  const trip = await tx.objectStore("trips").get(tripId);
  if (trip) await tx.objectStore("trips").put({ ...trip, updatedAt: timestamp });
  await tx.done;
}

export async function getMediaForTrip(tripId) {
  const db = await dbPromise;
  return db.getAllFromIndex("media", "tripId", tripId);
}

export async function getMediaForPlace(placeId) {
  const db = await dbPromise;
  return db.getAllFromIndex("media", "placeId", placeId);
}

export async function deleteMedia(mediaId) {
  const db = await dbPromise;
  await db.delete("media", mediaId);
}

export async function listFeedPosts() {
  const db = await dbPromise;
  const posts = await db.getAllFromIndex("feedPosts", "createdAt");
  return posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function publishTripToFeed({ trip, places, user }) {
  const db = await dbPromise;
  const post = {
    id: `trip-${trip.id}`,
    authorId: user.id,
    authorName: user.name,
    title: trip.title,
    area: places[0]?.name || "내 여행",
    category: "여행코스",
    duration: `${Math.max(places.length, 1)}곳`,
    caption: places.map((place) => place.name).join(" · ") || "아직 장소가 적은 코스",
    likes: 0,
    saves: 0,
    coverTone: "mint",
    places: places.map((place) => ({
      order: place.order,
      name: place.name,
      memo: place.note,
    })),
    sourceTripId: trip.id,
    createdAt: now(),
  };
  await db.put("feedPosts", post);
  return post;
}

/* ---------------------------------------------------------------------------
 * Covers, stats, saves, likes, settings, backup — added for the v2 design.
 * ------------------------------------------------------------------------- */

export async function getTripCovers() {
  const db = await dbPromise;
  const covers = {};
  let cursor = await db.transaction("media").store.openCursor();
  while (cursor) {
    const item = cursor.value;
    if (item.tripId && !covers[item.tripId] && item.type === "image") covers[item.tripId] = item;
    cursor = await cursor.continue();
  }
  return covers;
}

export async function getStats() {
  const db = await dbPromise;
  const [trips, places, media] = await Promise.all([
    db.count("trips"),
    db.count("places"),
    db.getAll("media"),
  ]);
  return {
    trips,
    places,
    photos: media.filter((item) => item.type === "image").length,
    videos: media.filter((item) => item.type === "video").length,
  };
}

const markKey = (userId, postId) => `${userId || "local"}::${postId}`;

async function listMarks(store, userId) {
  const db = await dbPromise;
  const prefix = `${userId || "local"}::`;
  const rows = await db.getAll(store);
  return rows.filter((row) => row.id.startsWith(prefix)).map((row) => row.postId);
}

async function toggleMark(store, userId, postId) {
  const db = await dbPromise;
  const id = markKey(userId, postId);
  const existing = await db.get(store, id);
  if (existing) {
    await db.delete(store, id);
    return false;
  }
  await db.put(store, { id, postId, userId: userId || "local", createdAt: now() });
  return true;
}

export const listSavedPostIds = (userId) => listMarks("saved", userId);
export const toggleSavedPost = (userId, postId) => toggleMark("saved", userId, postId);

const DEFAULT_SETTINGS = { id: "prefs", feedPublic: false, autoLogin: true };

export async function getSettings() {
  const db = await dbPromise;
  return { ...DEFAULT_SETTINGS, ...((await db.get("settings", "prefs")) || {}) };
}

export async function saveSettings(patch) {
  const db = await dbPromise;
  const next = { ...(await getSettings()), ...patch, id: "prefs" };
  await db.put("settings", next);
  return next;
}

export async function changePassword({ email, currentPassword, nextPassword }) {
  const db = await dbPromise;
  const user = await db.getFromIndex("users", "email", normalizeEmail(email));
  if (!user) throw new Error("가입된 계정을 찾을 수 없습니다.");

  const { passwordHash } = await hashPassword(currentPassword, user.salt);
  if (passwordHash !== user.passwordHash) throw new Error("현재 비밀번호가 맞지 않습니다.");
  if (!nextPassword || nextPassword.length < 6) throw new Error("새 비밀번호는 6자 이상이어야 합니다.");

  const passwordParts = await hashPassword(nextPassword);
  const updated = { ...user, passwordHash: passwordParts.passwordHash, salt: passwordParts.salt, updatedAt: now() };
  await db.put("users", updated);
  return publicUser(updated);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportBackup({ includeMedia = true } = {}) {
  const db = await dbPromise;
  const [trips, places, media] = await Promise.all([db.getAll("trips"), db.getAll("places"), db.getAll("media")]);

  const exportedMedia = await Promise.all(
    media.map(async ({ blob, ...meta }) => ({
      ...meta,
      dataUrl: includeMedia && blob ? await blobToDataUrl(blob) : undefined,
    }))
  );

  return {
    format: "save-my-journey-backup",
    version: 1,
    exportedAt: now(),
    trips,
    places,
    media: exportedMedia,
  };
}

export async function getPlaceCounts() {
  const db = await dbPromise;
  const places = await db.getAll("places");
  return places.reduce((acc, place) => {
    acc[place.tripId] = (acc[place.tripId] || 0) + 1;
    return acc;
  }, {});
}
