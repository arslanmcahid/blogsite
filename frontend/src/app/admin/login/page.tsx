"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Zaten giriş yapılmışsa giriş sayfası gösterilmez, doğrudan panele geçilir.
  const me = useApi<{ username: string }>("/api/auth/me/");
  useEffect(() => {
    if (me.data) router.replace("/admin");
  }, [me.data, router]);
  // Kontrol bitene kadar (ya da yönlendirilirken) form hiç çizilmez, böylece yanıp sönmez.
  if (me.loading || me.data) return <main className="login"><p className="muted">Yükleniyor…</p></main>;

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
      <form onSubmit={onSubmit}>
        <div className="brand"><MapPin size={20} aria-hidden /> Yönetim paneli</div>
        <label>Kullanıcı adı<input name="username" autoComplete="username" required autoFocus /></label>
        <label>Parola<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</button>
      </form>
    </main>
  );
}
