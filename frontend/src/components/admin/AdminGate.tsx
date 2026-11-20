"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminFetch, ApiError, useApi } from "@/lib/admin-api";

const NAV = [
  { href: "/admin", label: "Yazılar" },
  { href: "/admin/galleries", label: "Galeriler" },
  { href: "/admin/locations", label: "Konumlar" },
  { href: "/admin/home", label: "Ana sayfa" },
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
        <strong>Yönetim</strong>
        <nav>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={n.href === "/admin" ? (pathname === "/admin" || pathname.startsWith("/admin/posts") ? "active" : "") : pathname.startsWith(n.href) ? "active" : ""}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link href="/" target="_blank">Siteyi gör ↗</Link>
          <button onClick={logout}>Çıkış ({me.username})</button>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
