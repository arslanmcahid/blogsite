import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getGalleries } from "@/lib/api";

export const metadata: Metadata = { title: "Galeri" };

async function List() {
  const galleries = await getGalleries();
  if (galleries.length === 0) return <p className="muted">Henüz sergi yok.</p>;
  return (
    <div className="card-grid">
      {galleries.map((g) => (
        <article key={g.id} className="card">
          {g.cover_url && (
            <Link href={`/galeri/${g.slug}`} className="card-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.cover_url} alt="" loading="lazy" />
            </Link>
          )}
          <div className="card-body">
            <h3><Link href={`/galeri/${g.slug}`}>{g.title}</Link></h3>
            {g.description && <p>{g.description}</p>}
            {g.location_detail && <p className="tags">📍 {g.location_detail.name}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function GalleriesPage() {
  return (
    <main className="container">
      <h1>Galeri</h1>
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}><List /></Suspense>
    </main>
  );
}
