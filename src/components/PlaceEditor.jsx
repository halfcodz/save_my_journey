import { useEffect, useRef, useState } from "react";
import PinPicker from "./PinPicker.jsx";
import { CloseIcon, LocateIcon, PlayIcon, PlusIcon, SearchIcon } from "./Icons.jsx";
import { searchPlaces } from "../placeSearch.js";
import { dayLabel, formatDotDate, fromDateTimeParts, toDateInput, toTimeInput, useMediaUrls } from "../hooks.js";

const DEFAULT_POINT = { lat: 37.5665, lng: 126.978 };

/**
 * One stop inside a day. The place name leads, then photos, then what it felt
 * like; the day it belongs to is a chip row so several stops can share a day.
 */
export default function PlaceEditor({
  place,
  nextOrder,
  defaultDay = 1,
  maxDay = 1,
  initialPoint,
  media = [],
  onCancel,
  onSave,
  onDelete,
  onDeleteMedia,
}) {
  const order = place?.order || nextOrder;
  const [day, setDay] = useState(place?.day || defaultDay);
  const [name, setName] = useState(place?.name || "");
  const [date, setDate] = useState(toDateInput(place?.visitedAt));
  const [time, setTime] = useState(toTimeInput(place?.visitedAt));
  const [note, setNote] = useState(place?.note || "");
  const [point, setPoint] = useState(place ? { lat: place.lat, lng: place.lng } : initialPoint || DEFAULT_POINT);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const searchAbort = useRef(null);

  const savedMedia = useMediaUrls(media);
  const [stagedUrls, setStagedUrls] = useState([]);

  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setStagedUrls(next);
    return () => next.forEach((item) => URL.revokeObjectURL(item.url));
  }, [files]);

  useEffect(() => () => searchAbort.current?.abort(), []);

  const dayChoices = Array.from({ length: Math.max(maxDay, day) }, (_, i) => i + 1);

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
        setResults([]);
        setLocating(false);
      },
      () => {
        setError("현재 위치 권한을 확인해 주세요.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const runSearch = async () => {
    const term = query.trim();
    if (!term || searching) return;
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;

    setError("");
    setSearching(true);
    try {
      const found = await searchPlaces(term, point, controller.signal);
      if (controller.signal.aborted) return;
      setResults(found);
      if (!found.length) setError("검색 결과가 없습니다. 영문 상호나 근처 지명으로도 찾아보세요.");
    } catch {
      if (!controller.signal.aborted) setError("위치 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };

  const pickResult = (result) => {
    setPoint({ lat: result.lat, lng: result.lng });
    if (!name.trim()) setName(result.name);
    setResults([]);
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
          day,
          name: name.trim() || `${dayLabel(day)} 기록`,
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
        <span className="title">{dayLabel(day)}</span>
        <span className="cancel spacer" aria-hidden="true">
          취소
        </span>
      </div>

      <div className="scroll">
        <div className="editor">
          <div className="field">
            <span>며칠째인가요</span>
            <div className="day-chips" role="group" aria-label="일차 선택">
              {dayChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className="chip"
                  aria-pressed={day === choice}
                  onClick={() => setDay(choice)}
                >
                  {dayLabel(choice)}
                </button>
              ))}
              <button
                type="button"
                className="chip add"
                onClick={() => setDay(dayChoices.length + 1)}
                aria-label="다음 일차 추가"
              >
                ＋
              </button>
            </div>
          </div>

          <label className="field hero">
            <span>어디였나요</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 블루보틀 성수" />
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
                    <img src={item.url} alt={item.name || "여행 사진"} loading="lazy" />
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
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="카페, 식당, 주소 검색"
                aria-label="위치 검색"
                enterKeyHint="search"
              />
              <button type="button" onClick={runSearch} disabled={searching}>
                {searching ? "검색 중" : "검색"}
              </button>
            </div>

            {results.length ? (
              <ul className="search-results">
                {results.map((result) => (
                  <li key={result.id}>
                    <button type="button" onClick={() => pickResult(result)}>
                      <strong>{result.name}</strong>
                      <span>{result.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <PinPicker point={point} order={String(order)} onChange={setPoint} />

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
          {dayLabel(day)}에 저장
        </button>
      </div>
    </form>
  );
}
