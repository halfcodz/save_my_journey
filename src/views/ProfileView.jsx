import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import PullToRefresh from "../components/PullToRefresh.jsx";

/**
 * 프로필 / 설정. Numbers first, then a plain list of switches and links — no
 * cards, no colour, hairlines only.
 */
export default function ProfileView({
  user,
  stats,
  settings,
  onToggleSetting,
  onExport,
  onChangePassword,
  onSignOut,
  onRefresh,
  avatarUrl,
  onPickAvatar,
  onClearAvatar,
}) {
  const [panel, setPanel] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const fileRef = useRef(null);

  const submitPassword = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await onChangePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "" });
      setPanel("");
    } catch (error) {
      setMessage(error.message || "비밀번호를 바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screen">
      <PullToRefresh className="scroll with-tabs" onRefresh={onRefresh}>
        <div className="profile-head">
          <button
            type="button"
            className="avatar-pick"
            onClick={() => setAvatarMenu(true)}
            aria-label="프로필 사진 바꾸기"
          >
            <span className="avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : user.name.slice(0, 1)}
            </span>
            <span className="avatar-edit" aria-hidden="true">
              변경
            </span>
          </button>
          <h1>{user.name}</h1>
          <span className="profile-email">{user.email}</span>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onPickAvatar(file);
            }}
          />
        </div>

        <div className="stat-row single">
          <div>
            <strong>{stats.trips}</strong>
            <span>여행</span>
          </div>
        </div>

        <div className="settings">
          <div className="setting">
            <div className="setting-copy">
              <span>피드에 코스 공개</span>
              <span className="setting-note">끄면 기록이 이 기기와 내 계정에만 남습니다</span>
            </div>
            <button
              type="button"
              className="toggle"
              aria-pressed={settings.feedPublic}
              aria-label="피드에 코스 공개"
              onClick={() => onToggleSetting("feedPublic")}
            />
          </div>

          <button type="button" className="setting" onClick={onExport}>
            <span>백업 내보내기</span>
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </button>

          <button
            type="button"
            className="setting"
            aria-expanded={panel === "password"}
            onClick={() => setPanel((current) => (current === "password" ? "" : "password"))}
          >
            <span>비밀번호 변경</span>
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </button>

          {panel === "password" ? (
            <form className="panel" onSubmit={submitPassword}>
              <label className="field underline">
                <span>현재 비밀번호</span>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
                  required
                />
              </label>
              <label className="field underline">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  minLength={6}
                  value={passwords.next}
                  onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
                  required
                />
              </label>
              {message ? <p className="form-error">{message}</p> : null}
              <button className="pill solid compact" type="submit" disabled={busy}>
                변경
              </button>
            </form>
          ) : null}

          <button type="button" className="setting quiet last" onClick={onSignOut}>
            <span>로그아웃</span>
          </button>
        </div>
      </PullToRefresh>

      {avatarMenu
        ? createPortal(
            <>
              <div className="scrim" onClick={() => setAvatarMenu(false)} role="presentation" />
              <div className="menu" role="dialog" aria-label="프로필 사진">
                <div className="menu-grip" aria-hidden="true" />
                <p className="menu-title">프로필 사진</p>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarMenu(false);
                    fileRef.current?.click();
                  }}
                >
                  갤러리에서 선택
                </button>
                <button
                  type="button"
                  disabled={!avatarUrl}
                  onClick={() => {
                    setAvatarMenu(false);
                    onClearAvatar();
                  }}
                >
                  기본 프로필 사용
                </button>
                <button type="button" className="quiet" onClick={() => setAvatarMenu(false)}>
                  닫기
                </button>
              </div>
            </>,
            document.body
          )
        : null}
    </section>
  );
}
