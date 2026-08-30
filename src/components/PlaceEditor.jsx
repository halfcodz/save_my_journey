import { useEffect, useState } from "react";
import PinPicker from "./PinPicker.jsx";
import { CloseIcon, LocateIcon, PlayIcon, PlusIcon, SearchIcon } from "./Icons.jsx";
import { formatDotDate, fromDateTimeParts, orderLabel, toDateInput, toTimeInput, useMediaUrls } from "../hooks.js";

const DEFAULT_POINT = { lat: 37.5665, lng: 126.978 };

const placeTitle = (result) => result.name || result.display_name?.split(",")[0]?.trim() || "선택한 위치";

/**
 * Full-screen place capture. Field labels sit above their values as small
 * letter-spaced eyebrows; the place name is the one field that carries the
 * heavy 1.5px black underline.
 */
export default function PlaceEditor({
  place,
  nextOrder,
  initialPoint,
  media = [],
  onCancel,
  onSave,
  onDelete,
  onDeleteMedia,
}) {
  const order = place?.order || nextOrder;
  const [name, setName] = useState(place?.name || "");
  const [date, setDate] = useState(toDateInput(place?.visitedAt));
  const [time, setTime] = useState(toTimeInput(place?.visitedAt));
  const [note, setNote] = useState(place?.note || "");
  const [point, setPoint] = useState(
    place ? { lat: place.lat, lng: place.lng } : initialPoint || DEFAULT_POINT
  );
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingTime, setEditingTime] = useState(false);

  const savedMedia = useMediaUrls(media);
  const [stagedUrls, setStagedUrls] = useState([]);

  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setStagedUrls(next);
    return () => next.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);

  const addFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    if (picked.length) setFiles((current) => [...current, ...picked]);
    event.target.value = "";
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저에서는 현재 위치를 쓸 수 없습니다.");
      return;
    }
    setError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationResults([]);
        setLocating(false);
      },
      () => {
        setError("현재 위치 권한을 확인해 주세요.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchLocation = async () => {
    const term = locationQuery.trim();
    if (!term || locationSearching) return;
    setError("");
    setLocationSearching(true);
    try {
      const params = new URLSearchParams({
        q: term,
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
        "accept-language": "ko",
        countrycodes: "kr",
      });

      // 같은 이름의 동네가 전국에 여럿 있으므로 지금 핀 주변을 우선한다.
      // bounded=0 이라 상자 밖 결과도 남되 순위만 밀린다.
      if (Number.isFinite(point?.lat) && Number.isFinite(point?.lng)) {
        const span = 0.45;
        params.set(
          "viewbox",
          [point.lng - span, point.lat + span, point.lng + span, point.lat - span].join(",")
        );
        params.set("bounded", "0");
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) throw new Error("검색 실패");
      const results = await response.json();
      setLocationResults(results);
      if (!results.length) setError("검색 결과가 없습니다. 장소명을 조금 더 구체적으로 입력해 주세요.");
    } catch {
      setError("위치 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLocationSearching(false);
    }
  };

  const pickLocationResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setPoint({ lat, lng });
    if (!name.trim()) setName(placeTitle(result));
    setLocationResults([]);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) {
      setError("지도에서 위치를 먼저 찍어 주세요.");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          id: place?.id,
          order,
          name: name.trim() || `${orderLabel(order)} 기록`,
          note: note.trim(),
          visitedAt: fromDateTimeParts(date, time),
          lat: point.lat,
          lng: point.lng,
        },
        files
      );
    } catch (saveError) {
      setError(saveError.message || "저장하지 못했습니다.");
      setSaving(false);
    }
  };

  return (
    <form className="screen" onSubmit={submit}>
      <div className="modal-bar">
        <button type="button" className="cancel" onClick={onCancel}>
          취소
        </button>
        <span className="title">{orderLabel(order)}</span>
        <span className="cancel spacer" aria-hidden="true">
          취소
        </span>
      </div>

      <div className="scroll">
        <div className="editor">
          <label className="field hero">
            <span>어디였나요</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 블루보틀 성수"
              autoFocus
            />
          </label>

          <div className="field">
            <span>사진</span>
            <div className="media-grid">
              {savedMedia.map((item) => (
                <figure key={item.id} className="media-tile">
                  {item.type === "video" ? (
                    <>
                      <video src={item.url} preload="metadata" muted playsInline />
                      <span className="video-mark">
                        <PlayIcon />
                      </span>
                    </>
                  ) : (
                    <img src={item.url} alt={item.name || "여행 사진"} />
                  )}
                  {onDeleteMedia ? (
                    <button
                      type="button"
                      className="media-remove"
                      onClick={() => onDeleteMedia(item.id)}
                      aria-label={`${item.name || "미디어"} 삭제`}
                    >
                      <CloseIcon width={10} height={10} />
                    </button>
                  ) : null}
                </figure>
              ))}

              {stagedUrls.map((item, index) => (
                <figure key={`${item.file.name}-${index}`} className="media-tile">
                  {item.file.type.startsWith("video/") ? (
                    <>
                      <video src={item.url} preload="metadata" muted playsInline />
                      <span className="video-mark">
                        <PlayIcon />
                      </span>
                    </>
                  ) : (
                    <img src={item.url} alt={item.file.name} />
                  )}
                  <button
                    type="button"
                    className="media-remove"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    aria-label={`${item.file.name} 첨부 취소`}
                  >
                    <CloseIcon width={10} height={10} />
                  </button>
                </figure>
              ))}

              <label className="media-add">
                <PlusIcon width={18} height={18} />
                <span className="sr-only">사진 또는 동영상 추가</span>
                <input type="file" accept="image/*,video/*" multiple onChange={addFiles} />
              </label>
            </div>
          </div>

          <label className="field">
            <span>그때의 감정</span>
            <textarea
              className="feeling"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="그 자리에서 느낀 것을 그대로 남겨 보세요."
              rows={3}
            />
          </label>

          <div className="field">
            <div className="field-note">
              <span>위치 · 시간</span>
              <button type="button" onClick={useCurrentLocation} disabled={locating}>
                <LocateIcon /> {locating ? "확인 중" : "내 위치"}
              </button>
            </div>

            <div className="map-search" data-no-swipe>
              <SearchIcon width={16} height={16} />
              <input
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchLocation();
                  }
                }}
                placeholder="장소나 주소 검색"
                aria-label="위치 검색"
              />
              <button type="button" onClick={searchLocation} disabled={locationSearching}>
                {locationSearching ? "검색 중" : "검색"}
              </button>
            </div>

            {locationResults.length ? (
              <ul className="search-results">
                {locationResults.map((result) => (
                  <li key={`${result.place_id}`}>
                    <button type="button" onClick={() => pickLocationResult(result)}>
                      <strong>{placeTitle(result)}</strong>
                      <span>{result.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <PinPicker point={point} order={orderLabel(order)} onChange={setPoint} />

            {editingTime ? (
              <div className="field-pair">
                <label className="field underline">
                  <span>날짜</span>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className="field underline">
                  <span>시간</span>
                  <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                </label>
              </div>
            ) : (
              <div className="when-row">
                <span>
                  {formatDotDate(fromDateTimeParts(date, time))} {time}
                </span>
                <button type="button" className="link-underline" onClick={() => setEditingTime(true)}>
                  수정
                </button>
              </div>
            )}
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          {place && onDelete ? (
            <button type="button" className="danger-link" onClick={() => onDelete(place.id)}>
              이 기록 삭제
            </button>
          ) : null}
        </div>
      </div>

      <div className="editor-foot">
        <button className="pill solid" type="submit" disabled={saving}>
          {orderLabel(order)}로 저장
        </button>
      </div>
    </form>
  );
}
