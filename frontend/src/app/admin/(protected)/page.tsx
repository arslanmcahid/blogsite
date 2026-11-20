"use client";

import Link from "next/link";
import { useApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { GallerySummary, PostSummary } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default function DashboardPage() {
  const posts = useApi<PostSummary[]>("/api/posts/");
  const galleries = useApi<GallerySummary[]>("/api/galleries/");
  const published = posts.data?.filter((p) => p.status === "published").length ?? 0;
  const drafts = posts.data?.filter((p) => p.status === "draft").length ?? 0;

  return (
    <div>
      <div className="hello">
        <h1>{greeting()} 👋</h1>
        <p>Bugün ne yapmak istersin?</p>
      </div>

      <div className="quick">
        <Link className="primary" href="/admin/posts/new"><span className="emoji">✍️</span><strong>Yeni yazı yaz</strong><small>Şablonla hızlıca başla</small></Link>
        <Link href="/admin/galleries/new"><span className="emoji">🎞️</span><strong>Fotoğraf sergisi aç</strong><small>Fotoğrafları sürükle, bırak</small></Link>
        <Link href="/admin/locations"><span className="emoji">📍</span><strong>Konum ekle</strong><small>Haritaya tıklayarak</small></Link>
        <Link href="/admin/home"><span className="emoji">🧭</span><strong>Ana sayfayı düzenle</strong><small>Bölümleri sırala</small></Link>
      </div>

      {posts.data && (
        <div className="stats">
          <div className="stat"><strong>{published}</strong><span>yayında yazı</span></div>
          <div className="stat"><strong>{drafts}</strong><span>taslak</span></div>
          <div className="stat"><strong>{galleries.data?.length ?? "–"}</strong><span>fotoğraf sergisi</span></div>
        </div>
      )}

      <div className="toolbar">
        <h2 style={{ margin: 0 }}>Yazıların</h2>
      </div>
      {posts.loading && <p className="muted">Yükleniyor…</p>}
      {posts.error && <p className="admin-error">{posts.error.message}</p>}
      {posts.data && posts.data.length === 0 && (
        <div className="empty-state">
          <span className="emoji">🌱</span>
          <p>Henüz hiç yazın yok. İlk yazını yazmaya ne dersin?</p>
          <Link className="btn primary" href="/admin/posts/new">İlk yazını yaz</Link>
        </div>
      )}
      {posts.data && posts.data.length > 0 && (
        <ul className="post-list">
          {posts.data.map((p) => (
            <li key={p.id}>
              {p.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb-sm" src={p.cover_url} alt="" />
              ) : <span className="thumb-sm" aria-hidden />}
              <Link className="title" href={`/admin/posts/${encodeURIComponent(p.slug)}`}>{p.title}</Link>
              <span className={`badge ${p.status}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span>
              <time>{p.published_at ? formatDate(p.published_at) : "—"}</time>
              <Link className="btn small" href={`/admin/posts/${encodeURIComponent(p.slug)}`}>Düzenle</Link>
              {p.status === "published" && <Link className="btn small" href={`/yazilar/${encodeURIComponent(p.slug)}`} target="_blank">Gör ↗</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
