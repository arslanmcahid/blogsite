"use client";

import Link from "next/link";
import { useApi } from "@/lib/admin-api";
import type { GallerySummary } from "@/lib/types";

export default function GalleriesAdminPage() {
  const { data, error, loading } = useApi<GallerySummary[]>("/api/galleries/");
  return (
    <div>
      <div className="toolbar">
        <h1>Galeriler</h1>
        <span className="spacer" />
        <Link className="btn primary" href="/admin/galleries/new">+ Yeni galeri</Link>
      </div>
      {loading && <p className="muted">Yükleniyor…</p>}
      {error && <p className="admin-error">{error.message}</p>}
      {data && data.length === 0 && <p className="muted">Henüz galeri yok.</p>}
      {data && data.length > 0 && (
        <table className="table">
          <thead><tr><th>Başlık</th><th>Durum</th><th>Konum</th></tr></thead>
          <tbody>
            {data.map((g) => (
              <tr key={g.id}>
                <td><Link href={`/admin/galleries/${encodeURIComponent(g.slug)}`}>{g.title}</Link></td>
                <td><span className={`badge ${g.is_published ? "published" : "draft"}`}>{g.is_published ? "Yayında" : "Taslak"}</span></td>
                <td className="muted">{g.location_detail?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
