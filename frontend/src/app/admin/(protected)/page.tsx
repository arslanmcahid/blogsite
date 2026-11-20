"use client";

import Link from "next/link";
import { useApi } from "@/lib/admin-api";
import type { PostSummary } from "@/lib/types";

export default function PostsAdminPage() {
  const { data, error, loading } = useApi<PostSummary[]>("/api/posts/");
  return (
    <div>
      <div className="toolbar">
        <h1>Yazılar</h1>
        <span className="spacer" />
        <Link className="btn primary" href="/admin/posts/new">+ Yeni yazı</Link>
      </div>
      {loading && <p className="muted">Yükleniyor…</p>}
      {error && <p className="admin-error">{error.message}</p>}
      {data && data.length === 0 && <p className="muted">Henüz yazı yok.</p>}
      {data && data.length > 0 && (
        <table className="table">
          <thead><tr><th>Başlık</th><th>Durum</th><th>Tarih</th></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/posts/${encodeURIComponent(p.slug)}`}>{p.title}</Link></td>
                <td><span className={`badge ${p.status}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span></td>
                <td className="muted">{p.published_at ? new Date(p.published_at).toLocaleDateString("tr-TR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
