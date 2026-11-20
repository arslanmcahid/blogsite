"use client";

import Link from "next/link";
import { useApi } from "@/lib/admin-api";
import type { GallerySummary } from "@/lib/types";

export default function GalleriesAdminPage() {
  const { data, error, loading } = useApi<GallerySummary[]>("/api/galleries/");
  return (
    <div>
      <div className="toolbar">
        <h1>Fotoğraf sergileri</h1>
        <span className="spacer" />
        <Link className="btn primary" href="/admin/galleries/new">＋ Yeni sergi</Link>
      </div>
      {loading && <p className="muted">Yükleniyor…</p>}
      {error && <p className="admin-error">{error.message}</p>}
      {data && data.length === 0 && (
        <div className="empty-state">
          <span className="emoji">🎞️</span>
          <p>Henüz bir fotoğraf sergin yok. Fotoğraflarını bir araya getirip sergileyebilirsin.</p>
          <Link className="btn primary" href="/admin/galleries/new">İlk sergini aç</Link>
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="post-list">
          {data.map((g) => (
            <li key={g.id}>
              {g.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb-sm" src={g.cover_url} alt="" />
              ) : <span className="thumb-sm" aria-hidden />}
              <Link className="title" href={`/admin/galleries/${encodeURIComponent(g.slug)}`}>{g.title}</Link>
              <span className={`badge ${g.is_published ? "published" : "draft"}`}>{g.is_published ? "Yayında" : "Taslak"}</span>
              <span className="muted small">{g.location_detail ? `📍 ${g.location_detail.name}` : ""}</span>
              <Link className="btn small" href={`/admin/galleries/${encodeURIComponent(g.slug)}`}>Düzenle</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
