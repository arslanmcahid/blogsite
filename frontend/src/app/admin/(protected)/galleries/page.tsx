"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { GallerySummary } from "@/lib/types";

export default function GalleriesAdminPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<GallerySummary[]>("/api/galleries/");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "published" | "draft">("");

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (g) =>
          (!status || (status === "published") === g.is_published) &&
          g.title.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")),
      ),
    [data, query, status],
  );

  async function toggle(g: GallerySummary) {
    try {
      await adminFetch(`/api/galleries/${encodeURIComponent(g.slug)}/`, { method: "PATCH", json: { is_published: !g.is_published } });
      toast.success(g.is_published ? `“${g.title}” taslağa alındı.` : `“${g.title}” yayınlandı.`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(g: GallerySummary) {
    if (!confirm(`“${g.title}” sergisi silinsin mi? Fotoğraflar kütüphanede kalır.`)) return;
    try {
      await adminFetch(`/api/galleries/${encodeURIComponent(g.slug)}/`, { method: "DELETE" });
      toast.success("Sergi silindi.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara..." aria-label="Sergilerde ara" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Durum süzgeci">
          <option value="">Tüm durumlar</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
        <Link href="/admin/galleries/new" className="btn primary" style={{ marginLeft: "auto" }}>Yeni sergi</Link>
      </div>
      {error && <p className="admin-error">{error.message}</p>}
      {loading && <p className="muted">Yükleniyor…</p>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Ad</th><th>Durum</th><th>Konum</th><th style={{ textAlign: "right" }}>İşlemler</th></tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="name">
                    <div className="cell-thumb">
                      {g.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb-sm" src={g.cover_url} alt="" />
                      ) : <span className="thumb-sm" aria-hidden />}
                      <Link href={`/admin/galleries/${encodeURIComponent(g.slug)}`}>{g.title}</Link>
                    </div>
                  </td>
                  <td><span className={`badge ${g.is_published ? "published" : "draft"}`}>{g.is_published ? "Yayında" : "Taslak"}</span></td>
                  <td className="muted">{g.location_detail?.name ?? "—"}</td>
                  <td>
                    <div className="actions">
                      <Link className="btn small" href={`/admin/galleries/${encodeURIComponent(g.slug)}`}>Düzenle</Link>
                      {g.is_published && <Link className="btn small" href={`/galeri/${encodeURIComponent(g.slug)}`} target="_blank">Sitede gör</Link>}
                      <button className="btn small" onClick={() => toggle(g)}>{g.is_published ? "Taslağa al" : "Yayınla"}</button>
                      <button className="btn small danger" onClick={() => remove(g)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="muted" style={{ textAlign: "center", padding: 32 }}>{data.length === 0 ? "Henüz sergi yok." : "Aramaya uyan sergi bulunamadı."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
