import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { User } from "../lib/types";

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy(true);
      const form = new FormData(event.currentTarget);
      const payload = {
        email: String(form.get("email")),
        password: String(form.get("password")),
        displayName: String(form.get("displayName") || "CapCycle User"),
      };
      const path = authMode === "login" ? "/auth/login" : "/auth/register";
      const result = await api<{ user: User; token: string }>(path, { method: "POST", body: payload });
      setSession(result.token, result.user);
      navigate("/");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "認証に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="center-page">
      <section className="panel auth-panel">
        <h2>{authMode === "login" ? "ログイン" : "新規登録"}</h2>
        {notice && <div className="notice">{notice}</div>}
        <form onSubmit={submitAuth}>
          {authMode === "register" && (
            <label>
              名前
              <input name="displayName" defaultValue="CapCycle User" />
            </label>
          )}
          <label>
            メール
            <input name="email" type="email" defaultValue={authMode === "login" ? "demo@capcycle.test" : ""} />
          </label>
          <label>
            パスワード
            <input name="password" type="password" defaultValue={authMode === "login" ? "password" : ""} />
          </label>
          <button className="primary" disabled={busy}>{busy ? "接続中" : authMode === "login" ? "ログイン" : "登録"}</button>
        </form>
        {authMode === "login" ? (
          <button type="button" className="secondary-action" onClick={() => setAuthMode("register")}>
            新規登録
          </button>
        ) : (
          <button type="button" className="secondary-action" onClick={() => setAuthMode("login")}>
            ログインに戻る
          </button>
        )}
      </section>
    </section>
  );
}
