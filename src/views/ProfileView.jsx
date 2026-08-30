import { useState } from "react";
import PullToRefresh from "../components/PullToRefresh.jsx";

/**
 * 프로필 / 설정. Numbers first, then a plain list of switches and links — no
 * cards, no colour, hairlines only.
 */
export default function ProfileView({
  user,
  stats,
  settings,
  install,
  onToggleSetting,
  onExport,
  onChangePassword,
  onSignOut,
  onRefresh,
}) {
  const [panel, setPanel] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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

  const installNote = install.installed
    ? "설치됨"
    : install.canInstall
      ? null
      : "브라우저 메뉴에서 추가";

  return (
    <section className="screen">
      <PullToRefresh className="scroll with-tabs" onRefresh={onRefresh}>
        <div className="profile-head">
          <span className="avatar" aria-hidden="true">
            {user.name.slice(0, 1)}
          </span>
          <div>
            <h1>{user.name}</h1>
            <span>{user.email}</span>
          </div>
        </div>

        <div className="stat-row">
          <div>
            <strong>{stats.trips}</strong>
            <span>여행</span>
          </div>
          <div>
            <strong>{stats.places}</strong>
            <span>핀</span>
          </div>
          <div>
            <strong>{stats.photos}</strong>
            <span>사진</span>
          </div>
        </div>

        <div className="settings">
          <div className="setting">
            <span>홈 화면에 앱 추가</span>
            {installNote ? (
              <span className="note">{installNote}</span>
            ) : (
              <button type="button" className="action" onClick={install.promptInstall}>
                설치
              </button>
            )}
          </div>

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
    </section>
  );
}
