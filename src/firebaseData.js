import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const firestore = app ? getFirestore(app) : null;

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function requireFirebase() {
  if (!isFirebaseConfigured || !auth || !firestore) {
    throw new Error("Firebase 환경변수가 설정되지 않았습니다.");
  }
}

function publicUser(firebaseUser) {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "여행자",
    email: firebaseUser.email,
  };
}

function currentUser() {
  requireFirebase();
  if (!auth.currentUser) throw new Error("로그인이 필요합니다.");
  return auth.currentUser;
}

const userDoc = (userId = currentUser().uid) => doc(firestore, "users", userId);
const tripsCol = (userId = currentUser().uid) => collection(firestore, "users", userId, "trips");
const tripDoc = (tripId, userId = currentUser().uid) => doc(firestore, "users", userId, "trips", tripId);
const placesCol = (tripId, userId = currentUser().uid) => collection(firestore, "users", userId, "trips", tripId, "places");
const placeDoc = (tripId, placeId, userId = currentUser().uid) =>
  doc(firestore, "users", userId, "trips", tripId, "places", placeId);

export async function getSessionUser() {
  requireFirebase();
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe();
      resolve(publicUser(firebaseUser));
    });
  });
}

export async function signUp({ name, email, password }) {
  requireFirebase();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const displayName = name.trim() || "여행자";
  await updateProfile(credential.user, { displayName });
  await setDoc(userDoc(credential.user.uid), {
    name: displayName,
    email: credential.user.email,
    createdAt: now(),
    updatedAt: now(),
  });
  return publicUser({ ...credential.user, displayName });
}

export async function signIn({ email, password }) {
  requireFirebase();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return publicUser(credential.user);
}

export async function signOut() {
  requireFirebase();
  await firebaseSignOut(auth);
}

export async function resetPassword({ email }) {
  requireFirebase();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function listTrips() {
  const snapshot = await getDocs(query(tripsCol(), orderBy("updatedAt", "desc")));
  return snapshot.docs.map((item) => item.data());
}

export async function createTrip(title) {
  const user = currentUser();
  const timestamp = now();
  const trip = {
    id: uid(),
    ownerId: user.uid,
    title: title.trim() || `새 여행 ${new Date().toLocaleDateString("ko-KR")}`,
    status: "active",
    visibility: "private",
    createdAt: timestamp,
    startedAt: timestamp,
    updatedAt: timestamp,
  };
  await setDoc(tripDoc(trip.id, user.uid), trip);
  return trip;
}

export async function updateTrip(trip) {
  const next = { ...trip, updatedAt: now() };
  await updateDoc(tripDoc(trip.id), next);
  return next;
}

export async function deleteTrip(tripId) {
  const placeSnapshot = await getDocs(placesCol(tripId));
  await Promise.all(placeSnapshot.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(tripDoc(tripId));
}

export async function deletePlace(placeId, tripId) {
  if (!tripId) throw new Error("여행 ID가 필요합니다.");
  await deleteDoc(placeDoc(tripId, placeId));
  await updateTrip({ id: tripId });
}

export async function getPlaces(tripId) {
  const snapshot = await getDocs(query(placesCol(tripId), orderBy("order", "asc")));
  return snapshot.docs.map((item) => item.data());
}

export async function savePlace(placeInput) {
  const timestamp = now();
  const place = {
    ...placeInput,
    id: placeInput.id || uid(),
    updatedAt: timestamp,
    createdAt: placeInput.createdAt || timestamp,
  };
  await setDoc(placeDoc(place.tripId, place.id), place, { merge: true });
  await updateTrip({ id: place.tripId });
  return place;
}

export async function reorderPlaces(tripId, orderedPlaces) {
  const timestamp = now();
  await Promise.all(
    orderedPlaces.map((place, index) =>
      setDoc(placeDoc(tripId, place.id), { ...place, order: index + 1, updatedAt: timestamp }, { merge: true })
    )
  );
  await updateTrip({ id: tripId });
}

export async function listFeedPosts() {
  requireFirebase();
  const snapshot = await getDocs(query(collection(firestore, "feedPosts"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => item.data());
}

export async function publishTripToFeed({ trip, places, user }) {
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
    coverTone: "mint",
    places: places.map((place) => ({
      order: place.order,
      name: place.name,
      memo: place.note,
    })),
    sourceTripId: trip.id,
    createdAt: now(),
  };
  await setDoc(doc(firestore, "feedPosts", post.id), post, { merge: true });
  await updateTrip({ ...trip, visibility: "public" });
  return post;
}

export async function changePassword({ currentPassword, nextPassword }) {
  requireFirebase();
  const current = auth.currentUser;
  if (!current) throw new Error("로그인 상태를 확인해 주세요.");
  if (!nextPassword || nextPassword.length < 6) throw new Error("새 비밀번호는 6자 이상이어야 합니다.");

  await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, currentPassword));
  await updatePassword(current, nextPassword);
  return { id: current.uid, name: current.displayName || "여행자", email: current.email };
}

export async function getPlaceCounts() {
  requireFirebase();
  const trips = await listTrips();
  const entries = await Promise.all(trips.map(async (trip) => [trip.id, (await getPlaces(trip.id)).length]));
  return Object.fromEntries(entries);
}
