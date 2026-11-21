"use client";

import { CircleHelp, FileText, Megaphone, Globe, Images, LayoutDashboard, LogOut, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { adminFetch, ApiError, useApi } from "@/lib/admin-api";
import { HowTo, type HowToHandle } from "./HowTo";
import { ToastProvider } from "./Toast";

const NAV = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Yazılar", icon: FileText },
  { href: "/admin/galleries", label: "Fotoğraf sergileri", icon: Images },
  { href: "/admin/locations", label: "Konumlar", icon: MapPin },
  { href: "/admin/home", label: "Ana sayfa düzeni", icon: Navigation },
  { href: "/admin/ads", label: "Reklamlar", icon: Megaphone },
];

/** Üst çubuktaki sayfa başlığı. */
function titleFor(pathname: string): string {
  if (pathname === "/admin") return "Panel";
  if (pathname === "/admin/posts") return "Yazılar";
  if (pathname === "/admin/posts/new") return "Yeni yazı";
  if (pathname.startsWith("/admin/posts/")) return "Yazıyı düzenle";
  if (pathname === "/admin/galleries") return "Fotoğraf sergileri";
  if (pathname === "/admin/galleries/new") return "Yeni sergi";
  if (pathname.startsWith("/admin/galleries/")) return "Sergiyi düzenle";
  if (pathname.startsWith("/admin/locations")) return "Konumlar";
  if (pathname.startsWith("/admin/home")) return "Ana sayfa düzeni";
  if (pathname === "/admin/ads") return "Reklamlar";
  if (pathname === "/admin/ads/new") return "Yeni reklam";
  if (pathname.startsWith("/admin/ads/")) return "Reklamı düzenle";
  return "Yönetim";
}

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, error } = useApi<{ username: string }>("/api/auth/me/");
  const howto = useRef<HowToHandle>(null);

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) router.replace("/admin/login");
  }, [error, router]);

  if (error && !(error instanceof ApiError && error.status === 401)) {
    return <p className="admin-error" style={{ margin: 24 }}>{error.message}</p>;
  }
  if (!me) return <p className="muted" style={{ padding: 24 }}>Yükleniyor…</p>;

  async function logout() {
    await adminFetch("/api/auth/logout/", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/admin" className="brand"><MapPin size={20} aria-hidden /> Blog yönetimi</Link>
        <nav aria-label="Yönetim menüsü">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-tour={`nav-${href.split("/").pop() || "panel"}`} className={`nav-item ${isActive(pathname, href) ? "active" : ""}`} aria-current={isActive(pathname, href) ? "page" : undefined}>
              <Icon size={16} aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <button type="button" className="nav-item" onClick={() => howto.current?.open()}><CircleHelp size={16} aria-hidden /> Nasıl kullanılır?</button>
        <Link href="/" target="_blank" className="nav-item"><Globe size={16} aria-hidden /> Siteyi aç</Link>
        <button type="button" className="nav-item" onClick={logout}><LogOut size={16} aria-hidden /> Çıkış yap</button>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <h1>{titleFor(pathname)}</h1>
          <span className="who">{me.username}</span>
        </header>
        <nav className="mobile-nav" aria-label="Yönetim menüsü (mobil)">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} data-tour={`nav-${href.split("/").pop() || "panel"}`} className={`nav-item ${isActive(pathname, href) ? "active" : ""}`}>
              <Icon size={16} aria-hidden /> {label}
            </Link>
          ))}
          <button type="button" className="nav-item" onClick={() => howto.current?.open()}><CircleHelp size={16} aria-hidden /> Yardım</button>
          <button type="button" className="nav-item" onClick={logout}><LogOut size={16} aria-hidden /> Çıkış</button>
        </nav>
        <main className="content"><ToastProvider>{children}</ToastProvider></main>
        <HowTo handle={howto} />
      </div>
    </div>
  );
}
