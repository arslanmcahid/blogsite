"use client";

import Link from "next/link";
import { useApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { GallerySummary, Location, PostSummary } from "@/lib/types";

export default function DashboardPage() {
  const posts = useApi<PostSummary[]>("/api/posts/");
  const galleries = useApi<GallerySummary[]>("/api/galleries/");
  const locations = useApi<Location[]>("/api/locations/");

  const published = posts.data?.filter((p) => p.status === "published").length;
  const drafts = posts.data?.filter((p) => p.status === "draft").length;
  const recent = [...(posts.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);

  const cards = [
    { label: "Yayındaki yazı", value: published },
    { label: "Taslak", value: drafts },
    { label: "Fotoğraf sergisi", value: galleries.data?.length },
    { label: "Konum", value: locations.data?.length },
  ];

  return (
    <div>
      <div className="stats">
        {cards.map((c) => (
          <div key={c.label} className="stat">
            <span>{c.label}</span>
            <strong>{c.value ?? "—"}</strong>
          </div>
        ))}
      </div>

      <div className="section-head">
        <h2>Son güncellenen yazılar</h2>
        <Link href="/admin/posts/new" className="btn primary">Yeni yazı</Link>
      </div>
      {posts.error && <p className="admin-error">{posts.error.message}</p>}
      <div className="recent">
        {recent.map((p) => (
          <Link key={p.id} href={`/admin/posts/${encodeURIComponent(p.slug)}`}>
            <div>
              <div className="t">{p.title}</div>
              <div className="s">{p.published_at ? formatDate(p.published_at) : "Yayın tarihi yok"}</div>
            </div>
            <span className={`badge ${p.status}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span>
          </Link>
        ))}
        {posts.data && recent.length === 0 && <p className="muted" style={{ padding: "32px 20px", textAlign: "center", margin: 0 }}>Henüz yazı yok.</p>}
        {posts.loading && <p className="muted" style={{ padding: 20, margin: 0 }}>Yükleniyor…</p>}
      </div>
    </div>
  );
}
