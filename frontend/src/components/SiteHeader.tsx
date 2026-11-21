import Link from "next/link";
import { AdminLink } from "./AdminLink";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">Blog</Link>
      <nav aria-label="Ana menü">
        <Link href="/yazilar">Yazılar</Link>
        <Link href="/galeri">Galeri</Link>
        <Link href="/harita">Harita</Link>
        <AdminLink />
      </nav>
    </header>
  );
}
