import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { AdminLink } from "./AdminLink";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">{SITE_NAME}</Link>
      <nav aria-label="Ana menü">
        <Link href="/yazilar">Yazılar</Link>
        <Link href="/galeri">Galeri</Link>
        <Link href="/harita">Harita</Link>
        <AdminLink />
      </nav>
    </header>
  );
}
