import { useCallback, useEffect, useMemo, useState } from "react";
import {
  changePassword,
  createTrip,
  deleteMedia,
  deletePlace,
  deleteTrip,
  exportBackup,
  getMediaForTrip,
  getPlaceCounts,
  getPlaces,
  getSessionUser,
  getSettings,
  getStats,
  getTripCovers,
  listFeedPosts,
  listTrips,
  publishTripToFeed,
  reorderPlaces,
  savePlace,
  saveSettings,
  signOut,
  updateTrip,
} from "./data.js";
import PlaceEditor from "./components/PlaceEditor.jsx";
import ReelsView from "./components/ReelsView.jsx";
import ReorderScreen from "./components/ReorderScreen.jsx";
import TabBar, { TABS } from "./components/TabBar.jsx";
import TabPager from "./components/TabPager.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import AuthView from "./views/AuthView.jsx";
import RecordsView from "./views/RecordsView.jsx";
import ProfileView from "./views/ProfileView.jsx";
import TripDetailView from "./views/TripDetailView.jsx";
import SearchView from "./views/SearchView.jsx";
import { useBlobUrlMap, useInstallPrompt } from "./hooks.js";

const SESSION_MARK = "smj-browser-session";
const TAB_ROUTES = TABS.map((tab) => tab.id);
const GUEST = { id: "guest", name: "게스트", email: "로그인하면 기록이 저장됩니다", guest: true };

const todayTitle = () => `${new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date())} 코스`;

export default function App({ updateReady = false, onApplyUpdate }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({ feedPublic: false, autoLogin: true });

  const [trips, setTrips] = useState([]);
  const [covers, setCovers] = useState({});
  const [stats, setStats] = useState({ trips: 0, places: 0, photos: 0, videos: 0 });

  const [posts, setPosts] = useState([]);

  const [currentTripId, setCurrentTripId] = useState("");
  const [places, setPlaces] = useState([]);
  const [mediaByPlace, setMediaByPlace] = useState({});
  const [selectedPlaceId, setSelectedPlaceId] = useState("");

  const [route, setRoute] = useState({ name: "records" });
  const [notice, setNotice] = useState("");

  const install = useInstallPrompt();
  const isGuest = Boolean(user?.guest);

  const currentTrip = trips.find((trip) => trip.id === currentTripId) || null;

  /* --- object URLs ------------------------------------------------------- */

  const mediaRecords = useMemo(() => {
    const flat = {};
    Object.values(mediaByPlace).forEach((items) => items.forEach((item) => (flat[item.id] = item)));
    return flat;
  }, [mediaByPlace]);

  const mediaUrls = useBlobUrlMap(mediaRecords);
  const tripCoverUrls = useBlobUrlMap(covers);

  /* --- loading ----------------------------------------------------------- */

  const loadLibrary = useCallback(async (activeUser) => {
    const [nextTrips, counts, nextCovers, nextPosts] = await Promise.all([
      listTrips(),
      getPlaceCounts(),
      getTripCovers(),
      listFeedPosts(),
    ]);
    const nextStats = await getStats({ trips: nextTrips, placeCounts: counts });
    setTrips(nextTrips.map((trip) => ({ ...trip, placeCount: counts[trip.id] || 0 })));
    setCovers(nextCovers);
    setStats(nextStats);
    setPosts(nextPosts);

    return nextTrips;
  }, []);

  const loadTripDetail = useCallback(async (tripId) => {
    if (!tripId) {
      setPlaces([]);
      setMediaByPlace({});
      return;
    }

    const [nextPlaces, media] = await Promise.all([getPlaces(tripId), getMediaForTrip(tripId)]);
    setPlaces(nextPlaces);
    setMediaByPlace(
      media.reduce((acc, item) => {
        acc[item.placeId] = [...(acc[item.placeId] || []), item];
        return acc;
      }, {})
    );
    setSelectedPlaceId((current) => (nextPlaces.some((place) => place.id === current) ? current : nextPlaces[0]?.id || ""));
  }, []);

  useEffect(() => {
    (async () => {
      const prefs = await getSettings();
      setSettings(prefs);

      let sessionUser = null;
      try {
        sessionUser = await getSessionUser();
      } catch {
        sessionUser = null;
      }

      // 자동 로그인 off means the session only lives as long as the browser tab.
      if (sessionUser && !prefs.autoLogin && !sessionStorage.getItem(SESSION_MARK)) {
        await signOut();
        sessionUser = null;
      }

      setUser(sessionUser);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 둘러보기는 남의 코스를 보러 들어온 흐름이므로 피드는 반드시 채운다.
    if (isGuest) {
      listFeedPosts().then(setPosts).catch(() => setPosts([]));
      return;
    }

    loadLibrary(user).then((nextTrips) => {
      setCurrentTripId((current) => {
        if (current && nextTrips.some((trip) => trip.id === current)) return current;
        return (nextTrips.find((trip) => trip.status !== "complete") || nextTrips[0])?.id || "";
      });
    });
  }, [user, isGuest, loadLibrary]);

  useEffect(() => {
    if (isGuest) return;
    loadTripDetail(currentTripId);
  }, [currentTripId, isGuest, loadTripDetail]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  /* --- actions ----------------------------------------------------------- */

  const refreshAll = useCallback(
    async (tripId = currentTripId) => {
      await Promise.all([loadLibrary(user), loadTripDetail(tripId)]);
    },
    [loadLibrary, loadTripDetail, user, currentTripId]
  );

  const refreshFromPull = useCallback(async () => {
    if (isGuest) {
      await listFeedPosts().then(setPosts).catch(() => {});
      return;
    }
    await refreshAll(currentTripId);
  }, [isGuest, refreshAll, currentTripId]);

  const onAuthed = async (nextUser, autoLogin) => {
    sessionStorage.setItem(SESSION_MARK, "1");
    setSettings(await saveSettings({ autoLogin }));
    setUser(nextUser);
    setRoute({ name: "records" });
  };

  const handleSignOut = async () => {
    if (!isGuest) await signOut();
    sessionStorage.removeItem(SESSION_MARK);
    setUser(null);
    setCurrentTripId("");
    setPlaces([]);
    setMediaByPlace({});
    setRoute({ name: "records" });
  };

  const openTrip = (tripId, from = "records") => {
    setCurrentTripId(tripId);
    setSelectedPlaceId("");
    setRoute({ name: "trip", from });
  };

  const startTrip = async (title) => {
    const trip = await createTrip(title || todayTitle());
    await loadLibrary(user);
    setCurrentTripId(trip.id);
    setSelectedPlaceId("");
    setRoute({ name: "trip", from: "records" });
    setNotice("새 여행을 시작했습니다.");
    return trip;
  };

  const openPlaceEditor = async (placeId = null) => {
    let tripId = currentTripId;
    if (!tripId) {
      const trip = await startTrip();
      tripId = trip.id;
    }
    setRoute({ name: "place", placeId });
  };

  const handleSavePlace = async (placeInput, files) => {
    const saved = await savePlace({ ...placeInput, tripId: currentTripId }, files);
    await refreshAll(currentTripId);
    setSelectedPlaceId(saved.id);
    setRoute({ name: "trip" });
    setNotice("장소 기록을 저장했습니다.");
  };

  const handleDeletePlace = async (placeId) => {
    if (!confirm("이 장소와 첨부한 사진·영상을 삭제할까요?")) return;
    await deletePlace(placeId, currentTripId);
    await refreshAll(currentTripId);
    setSelectedPlaceId("");
    setRoute({ name: "trip" });
    setNotice("장소를 삭제했습니다.");
  };

  const handleDeleteMedia = async (mediaId) => {
    await deleteMedia(mediaId);
    await refreshAll(currentTripId);
  };

  const handleReorderDone = async (ordered) => {
    const normalized = ordered.map((place, index) => ({ ...place, order: index + 1 }));
    setPlaces(normalized);
    await reorderPlaces(currentTripId, normalized);
    await loadTripDetail(currentTripId);
    setRoute({ name: "trip" });
    setNotice("방문 순서를 바꿨습니다.");
  };

  const publishTrip = async () => {
    if (!currentTrip) return;
    if (!settings.feedPublic) {
      setNotice("프로필에서 ‘검색에 코스 공개’를 먼저 켜 주세요.");
      return;
    }
    await publishTripToFeed({ trip: currentTrip, places, user });
    await loadLibrary(user);
    setRoute({ name: "search" });
    setNotice("내 코스를 검색에 공개했습니다.");
  };

  const completeTrip = async () => {
    if (!currentTrip) return;
    const status = currentTrip.status === "complete" ? "active" : "complete";
    await updateTrip({
      ...currentTrip,
      status,
      endedAt: status === "complete" ? new Date().toISOString() : undefined,
    });
    await loadLibrary(user);

    if (status === "complete" && settings.feedPublic && places.length) {
      await publishTripToFeed({ trip: currentTrip, places, user });
      await loadLibrary(user);
      setNotice("여행을 완료하고 피드에 공개했습니다.");
      return;
    }
    setNotice(status === "complete" ? "여행을 완료로 표시했습니다." : "다시 기록 중으로 바꿨습니다.");
  };

  const removeTrip = async () => {
    if (!currentTrip) return;
    if (!confirm("이 여행과 모든 장소·미디어를 삭제할까요?")) return;
    await deleteTrip(currentTrip.id);
    const remaining = await loadLibrary(user);
    const next = remaining.find((trip) => trip.id !== currentTrip.id);
    setCurrentTripId(next?.id || "");
    setRoute({ name: "records" });
    setNotice("여행을 삭제했습니다.");
  };

  const toggleSetting = async (key) => {
    setSettings(await saveSettings({ [key]: !settings[key] }));
  };

  const runExport = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `save-my-journey-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("백업 파일을 내려받았습니다.");
  };

  const runChangePassword = async (current, next) => {
    await changePassword({ email: user.email, currentPassword: current, nextPassword: next });
    setNotice("비밀번호를 바꿨습니다.");
  };

  /* --- render ------------------------------------------------------------ */

  if (!ready) return <div className="loading-screen">여행장을 여는 중</div>;
  if (!user) return <AuthView onAuthed={onAuthed} onGuest={() => setUser(GUEST)} />;

  if (route.name === "reels" && currentTrip) {
    return (
      <ReelsView
        trip={currentTrip}
        places={places}
        mediaByPlace={mediaByPlace}
        startIndex={Math.max(0, places.findIndex((place) => place.id === selectedPlaceId))}
        onClose={() => setRoute({ name: "trip" })}
      />
    );
  }

  const editingPlace = route.name === "place" ? places.find((place) => place.id === route.placeId) || null : null;
  const showTabs = TAB_ROUTES.includes(route.name);

  const guestWall = (title) => (
    <section className="screen">
      <div className="screen-head">
        <h1 className="screen-title">{title}</h1>
      </div>
      <div className="empty">
        <span className="eyebrow">둘러보는 중</span>
        <h2>로그인하면 기록이 저장돼요.</h2>
        <p>지금은 다른 사람의 코스만 볼 수 있습니다.</p>
        <button className="pill solid" type="button" onClick={handleSignOut}>
          로그인하기
        </button>
      </div>
    </section>
  );

  const tabIndex = Math.max(0, TAB_ROUTES.indexOf(route.name));
  const goToTab = (id) => setRoute({ name: id });

  return (
    <main className="phone">
      {showTabs ? (
        <>
          <TabPager
            index={tabIndex}
            count={TAB_ROUTES.length}
            onIndexChange={(next) => goToTab(TAB_ROUTES[next])}
          >
            {[
              isGuest ? (
                guestWall("나만의 여행 코스")
              ) : (
                <RecordsView
                  trips={trips}
                  tripCoverUrls={tripCoverUrls}
                  onOpenTrip={openTrip}
                  onCreateTrip={startTrip}
                  onRefresh={refreshFromPull}
                />
              ),
              <SearchView posts={posts} onRefresh={refreshFromPull} />,
              isGuest ? (
                guestWall("프로필")
              ) : (
                <ProfileView
                  user={user}
                  stats={stats}
                  settings={settings}
                  install={install}
                  onToggleSetting={toggleSetting}
                  onExport={runExport}
                  onChangePassword={runChangePassword}
                  onSignOut={handleSignOut}
                  onRefresh={refreshFromPull}
                />
              ),
            ]}
          </TabPager>
          <TabBar active={route.name} onNavigate={goToTab} />
        </>
      ) : null}

      {route.name === "trip" && currentTrip ? (
        <TripDetailView
          trip={currentTrip}
          places={places}
          mediaByPlace={mediaByPlace}
          mediaUrls={mediaUrls}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={setSelectedPlaceId}
          onBack={() => setRoute({ name: route.from || "records" })}
          onReorder={() => setRoute({ name: "reorder" })}
          onAddPlace={() => openPlaceEditor(null)}
          onEditPlace={(placeId) => setRoute({ name: "place", placeId })}
          onComplete={completeTrip}
          onPublish={publishTrip}
          onOpenReels={() => setRoute({ name: "reels" })}
          onDeleteTrip={removeTrip}
        />
      ) : null}

      {route.name === "place" ? (
        <PlaceEditor
          key={route.placeId || "new"}
          place={editingPlace}
          nextOrder={places.length + 1}
          initialPoint={
            places.length ? { lat: places[places.length - 1].lat, lng: places[places.length - 1].lng } : null
          }
          media={editingPlace ? mediaByPlace[editingPlace.id] || [] : []}
          onCancel={() => setRoute({ name: currentTrip ? "trip" : "records" })}
          onSave={handleSavePlace}
          onDelete={handleDeletePlace}
          onDeleteMedia={handleDeleteMedia}
        />
      ) : null}

      {route.name === "reorder" ? (
        <ReorderScreen places={places} onCancel={() => setRoute({ name: "trip" })} onDone={handleReorderDone} />
      ) : null}

      {route.name === "trip" && !currentTrip ? (
        <section className="screen">
          <div className="empty">
            <span className="eyebrow">여행</span>
            <h2>선택한 여행이 없어요.</h2>
            <p>내 코스에서 여행을 고르거나 새로 만들어 주세요.</p>
            <button className="pill solid" type="button" onClick={() => setRoute({ name: "records" })}>
              내 코스로
            </button>
          </div>
        </section>
      ) : null}

      {updateReady ? <UpdateBanner onReload={onApplyUpdate} /> : null}

      {notice ? (
        <button className="notice" type="button" onClick={() => setNotice("")}>
          {notice}
        </button>
      ) : null}
    </main>
  );
}
