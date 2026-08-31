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

/** Counts kept on the trip so listing never has to read every place back. */
const countsOf = (places) => ({
  placeCount: places.length,
  dayCount: places.reduce((max, place) => Math.max(max, place.day || 1), 0),
});

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

export async function createTrip(title, kind = "travel") {
  const timestamp = now();
  const trip = {
    id: uid(),
    title: title.trim() || `새 여행 ${new Date().toLocaleDateString("ko-KR")}`,
    kind,
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
  // day가 없던 시절의 기록은 1일차로 읽는다.
  return places.map((place) => ({ ...place, day: place.day || 1 })).sort((a, b) => a.order - b.order);
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
    day: placeInput.day || existing?.day || 1,
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

  const siblings = await tx.objectStore("places").index("tripId").getAll(place.tripId);
  const trip = await tx.objectStore("trips").get(place.tripId);
  if (trip) await tx.objectStore("trips").put({ ...trip, ...countsOf(siblings), updatedAt: timestamp });
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
    const siblings = await tx.objectStore("places").index("tripId").getAll(place.tripId);
    const trip = await tx.objectStore("trips").get(place.tripId);
    if (trip) await tx.objectStore("trips").put({ ...trip, ...countsOf(siblings), updatedAt: now() });
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
  if (trip) await tx.objectStore("trips").put({ ...trip, ...countsOf(orderedPlaces), updatedAt: timestamp });
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
    kind: trip.kind || "travel",
    category: "여행코스",
    duration: `${Math.max(places.length, 1)}곳`,
    caption: places.map((place) => place.name).join(" · ") || "아직 장소가 적은 코스",
    likes: 0,
    saves: 0,
    coverTone: "mint",
    places: places.map((place) => ({
      order: place.order,
      day: place.day || 1,
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

/**
 * One cover photo per trip: the one the traveller picked, or the first photo
 * they added if they have not picked one.
 * @param {Array<{id:string, coverMediaId?:string}>} trips
 */
export async function getTripCovers(trips = []) {
  const db = await dbPromise;
  const covers = {};
  const store = db.transaction("media").store;
  const index = store.index("tripId");

  // 여행마다 첫 사진 하나만 꺼낸다. 전체를 훑으면 모든 사진 blob이 메모리로
  // 올라와 목록이 눈에 띄게 느려진다.
  for (const trip of trips) {
    if (trip.coverMediaId) {
      const chosen = await store.get(trip.coverMediaId);
      if (chosen) {
        covers[trip.id] = chosen;
        continue;
      }
    }

    let cursor = await index.openCursor(IDBKeyRange.only(trip.id));
    while (cursor) {
      if (cursor.value.type === "image") {
        covers[trip.id] = cursor.value;
        break;
      }
      cursor = await cursor.continue();
    }
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

export async function getTripCounts(trips = []) {
  const missing = trips.filter((trip) => trip.placeCount === undefined);
  const counts = Object.fromEntries(
    trips
      .filter((trip) => trip.placeCount !== undefined)
      .map((trip) => [trip.id, { places: trip.placeCount, days: trip.dayCount || 0 }])
  );
  if (!missing.length) return counts;

  // 예전 기록에는 개수가 새겨져 있지 않다. 그때만 한 번 세어 둔다.
  const db = await dbPromise;
  const places = await db.getAll("places");
  missing.forEach((trip) => {
    const own = places.filter((place) => place.tripId === trip.id);
    counts[trip.id] = { places: own.length, days: own.reduce((m, p) => Math.max(m, p.day || 1), 0) };
  });
  return counts;
}

/* --- profile photo ---------------------------------------------------------- */

export async function saveAvatar(file) {
  const db = await dbPromise;
  await db.put("settings", { id: "avatar", blob: file, updatedAt: now() });
  return file;
}

export async function getAvatar() {
  const db = await dbPromise;
  const record = await db.get("settings", "avatar");
  return record?.blob || null;
}

export async function clearAvatar() {
  const db = await dbPromise;
  await db.delete("settings", "avatar");
}
