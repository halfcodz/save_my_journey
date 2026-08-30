import { useState } from "react";
import { CheckIcon } from "../components/Icons.jsx";
import { findRecoveryQuestion, resetPassword, signIn, signUp, usesFirebaseBackend } from "../data.js";

const LEDE = {
  login: { title: ["다녀온 곳을", "순서대로."], copy: ["사진, 메모, 시간을 핀 하나에.", "기록은 먼저 이 기기에 저장됩니다."] },
  signup: { title: ["계정을 만들고", "기록을 시작해요."], copy: ["이름과 이메일만 있으면 됩니다.", "여행 기록은 이 기기에 남습니다."] },
  reset: { title: ["비밀번호를", "다시 정해요."], copy: ["가입할 때 남긴 복구 질문으로", "본인을 확인합니다."] },
};

/**
 * Bottom-weighted login. Fields are underlines rather than boxes so the 44px
 * headline stays the only heavy element on screen.
 */
export default function AuthView({ onAuthed, onGuest }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    recoveryQuestion: "가장 기억나는 여행지는?",
    recoveryAnswer: "",
    nextPassword: "",
  });

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const switchMode = (next) => {
    setMode(next);
    setMessage("");
    setRecoveryQuestion("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");

    try {
      if (mode === "login") {
        onAuthed(await signIn({ email: form.email, password: form.password }), autoLogin);
      } else if (mode === "signup") {
        onAuthed(
          await signUp({
            name: form.name,
            email: form.email,
            password: form.password,
            recoveryQuestion: form.recoveryQuestion,
            recoveryAnswer: form.recoveryAnswer,
          }),
          autoLogin
        );
      } else if (usesFirebaseBackend) {
        await resetPassword({ email: form.email });
        setMessage("가입 이메일로 비밀번호 재설정 링크를 보냈습니다.");
      } else if (!recoveryQuestion) {
        setRecoveryQuestion(await findRecoveryQuestion(form.email));
      } else {
        await resetPassword({
          email: form.email,
          recoveryAnswer: form.recoveryAnswer,
          nextPassword: form.nextPassword,
        });
        setMessage("비밀번호를 바꿨습니다. 새 비밀번호로 로그인하세요.");
        switchMode("login");
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const lede = LEDE[mode];
  const submitLabel =
    mode === "login"
      ? "로그인"
      : mode === "signup"
        ? "계정 만들기"
        : usesFirebaseBackend
          ? "재설정 메일 보내기"
          : recoveryQuestion
            ? "비밀번호 변경"
            : "질문 확인";

  return (
    <main className="phone">
      <form className="auth" onSubmit={submit}>
        <div className="auth-lede">
          <h1>
            {lede.title[0]}
            <br />
            {lede.title[1]}
          </h1>
          <p>
            {lede.copy[0]}
            <br />
            {lede.copy[1]}
          </p>
        </div>

        <div className="auth-fields">
          {mode === "signup" ? (
            <label className="field-line">
              <input value={form.name} onChange={update("name")} placeholder="이름" autoComplete="name" />
              <span className="field-tag">NAME</span>
            </label>
          ) : null}

          <label className="field-line">
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="me@example.com"
              autoComplete="email"
              required
            />
            <span className="field-tag">EMAIL</span>
          </label>

          {mode !== "reset" ? (
            <div className="field-line">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="비밀번호"
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                aria-label="비밀번호"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? "숨기기" : "보기"}
              </button>
            </div>
          ) : null}

          {mode === "signup" && !usesFirebaseBackend ? (
            <>
              <label className="field-line">
                <input value={form.recoveryQuestion} onChange={update("recoveryQuestion")} aria-label="복구 질문" />
                <span className="field-tag">QUESTION</span>
              </label>
              <label className="field-line">
                <input value={form.recoveryAnswer} onChange={update("recoveryAnswer")} placeholder="복구 답변" required />
                <span className="field-tag">ANSWER</span>
              </label>
            </>
          ) : null}

          {mode === "reset" && recoveryQuestion && !usesFirebaseBackend ? (
            <>
              <p className="form-error">{recoveryQuestion}</p>
              <label className="field-line">
                <input value={form.recoveryAnswer} onChange={update("recoveryAnswer")} placeholder="복구 답변" required />
                <span className="field-tag">ANSWER</span>
              </label>
              <label className="field-line">
                <input
                  type="password"
                  value={form.nextPassword}
                  onChange={update("nextPassword")}
                  placeholder="새 비밀번호"
                  minLength={6}
                  required
                />
                <span className="field-tag">NEW</span>
              </label>
            </>
          ) : null}

          {mode === "login" ? (
            <div className="auth-row">
              <label className="check">
                <input type="checkbox" checked={autoLogin} onChange={(event) => setAutoLogin(event.target.checked)} />
                <span className="check-box" aria-hidden="true">
                  <CheckIcon />
                </span>
                자동 로그인
              </label>
              <button type="button" className="link-underline" onClick={() => switchMode("reset")}>
                비밀번호 찾기
              </button>
            </div>
          ) : null}
        </div>

        {message ? <p className="form-error">{message}</p> : null}

        <div className="auth-actions">
          <button className="pill solid" type="submit" disabled={busy}>
            {submitLabel}
          </button>
          {mode === "login" ? (
            <button className="pill ghost" type="button" onClick={onGuest}>
              둘러보기
            </button>
          ) : (
            <button className="pill ghost" type="button" onClick={() => switchMode("login")}>
              로그인으로 돌아가기
            </button>
          )}
          {mode === "login" ? (
            <p className="auth-switch">
              처음이신가요?{" "}
              <button type="button" onClick={() => switchMode("signup")}>
                가입하기
              </button>
            </p>
          ) : null}
        </div>
      </form>
    </main>
  );
}
