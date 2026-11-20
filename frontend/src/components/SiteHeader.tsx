import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">Blog</Link>
      <nav>
        <Link href="/yazilar">Yazılar</Link>
        <Link href="/galeri">Galeri</Link>
        <Link href="/harita">Harita</Link>
      </nav>
    </header>
  );
}
