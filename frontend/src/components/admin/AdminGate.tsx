"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminFetch, ApiError, useApi } from "@/lib/admin-api";
import { ToastProvider } from "./Toast";

const NAV = [
  { href: "/admin", label: "Ana pano", emoji: "🏠" },
  { href: "/admin/galleries", label: "Fotoğraf sergileri", emoji: "🎞️" },
  { href: "/admin/locations", label: "Konumlar", emoji: "📍" },
  { href: "/admin/home", label: "Ana sayfa düzeni", emoji: "🧭" },
];

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, error } = useApi<{ username: string }>("/api/auth/me/");

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) router.replace("/admin/login");
  }, [error, router]);

  if (error && !(error instanceof ApiError && error.status === 401)) {
    return <p className="admin-error">Sunucuya ulaşılamadı: {error.message}</p>;
  }
  if (!me) return <p className="muted admin-pad">Yükleniyor…</p>;

  async function logout() {
    await adminFetch("/api/auth/logout/", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="admin">
      <aside className="admin-side">
        <strong>✦ Blog yönetimi</strong>
        <nav>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={n.href === "/admin" ? (pathname === "/admin" || pathname.startsWith("/admin/posts") ? "active" : "") : pathname.startsWith(n.href) ? "active" : ""}
            >
              <span aria-hidden>{n.emoji}</span> {n.label}
            </Link>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link href="/" target="_blank">🌐 Sitemi aç ↗</Link>
          <button onClick={logout}>Çıkış yap ({me.username})</button>
        </div>
      </aside>
      <div className="admin-main"><ToastProvider>{children}</ToastProvider></div>
    </div>
  );
}
