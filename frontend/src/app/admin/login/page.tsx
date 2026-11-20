"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, errorMessage } from "@/lib/admin-api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await adminFetch("/api/auth/login/", {
        method: "POST",
        json: { username: fd.get("username"), password: fd.get("password") },
      });
      router.replace("/admin");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={onSubmit} className="panel">
        <h1>Yönetim girişi</h1>
        <label>Kullanıcı adı<input name="username" autoComplete="username" required autoFocus /></label>
        <label>Parola<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      </form>
    </main>
  );
}
