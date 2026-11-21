import Link from "next/link";
import { getPosts } from "@/lib/api";
import { PostCard } from "./PostCard";

/** 404 sayfasının içeriği (hem ana düzenin içinde hem dışında kullanılır). */
export async function NotFoundView() {
  // Ziyaretçi boş elle dönmesin: en yeni yazıları öner. Backend'e ulaşılamazsa sayfa yine de açılır.
  const latest = await getPosts().then((p) => p.slice(0, 3)).catch(() => []);
  return (
    <main id="main" className="container nf">
      <div className="nf-hero">
        <svg className="nf-book" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 19c-5-3.2-12.5-4.2-19-3v28c6.5-1.2 14-.2 19 3 5-3.2 12.5-4.2 19-3V16c-6.5-1.2-14-.2-19 3z" fill="currentColor" opacity=".14" />
          <path d="M32 19c-5-3.2-12.5-4.2-19-3v28c6.5-1.2 14-.2 19 3 5-3.2 12.5-4.2 19-3V16c-6.5-1.2-14-.2-19 3zM32 19v28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="nf-code">404</p>
        <h1>Bu sayfayı bulamadık</h1>
        <p className="lead">Aradığın sayfa taşınmış, silinmiş ya da adres yanlış yazılmış olabilir. Ama okunacak başka yazılar var.</p>
        <p className="nf-actions">
          <Link href="/" className="btn">Ana sayfaya dön</Link>
          <Link href="/yazilar" className="btn">Tüm yazılar</Link>
        </p>
      </div>
      {latest.length > 0 && (
        <section>
          <h2>Belki bunlar ilgini çeker</h2>
          <div className="card-grid">{latest.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      )}
    </main>
  );
}
