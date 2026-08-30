import { useEffect, useState } from "react";
import PinPicker from "./PinPicker.jsx";
import { CloseIcon, LocateIcon, PlayIcon, PlusIcon } from "./Icons.jsx";
import { fromDateTimeParts, padOrder, toDateInput, toTimeInput, useMediaUrls } from "../hooks.js";

const DEFAULT_POINT = { lat: 37.5665, lng: 126.978 };

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
    navigator.geolocation.getCurrentPosition(
      (position) => setPoint({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => setError("현재 위치 권한을 확인해 주세요."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
          name: name.trim() || `장소 ${order}`,
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
        <span className="title">{padOrder(order)}번째 장소</span>
        <button type="submit" className="confirm" disabled={saving}>
          저장
        </button>
      </div>

      <div className="scroll">
        <div className="editor">
          <label className="field hero">
            <span>장소명</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 블루보틀 성수" autoFocus />
          </label>

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

          <div className="field">
            <div className="field-note">
              <span>위치 — 핀을 끌어 조정</span>
              <button type="button" onClick={useCurrentLocation}>
                <LocateIcon /> 현재 위치
              </button>
            </div>
            <PinPicker point={point} order={order} onChange={setPoint} />
          </div>

          <label className="field">
            <span>메모</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="그 장소에서 남기고 싶은 기억"
              rows={3}
            />
          </label>

          <div className="field">
            <span>사진 · 동영상</span>
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
                <PlusIcon width={16} height={16} />
                <span className="sr-only">사진 또는 동영상 추가</span>
                <input type="file" accept="image/*,video/*" multiple onChange={addFiles} />
              </label>
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          {place && onDelete ? (
            <button type="button" className="danger-link" onClick={() => onDelete(place.id)}>
              이 장소 삭제
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
