"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/types";

export default function PostsAdminPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<PostSummary[]>("/api/posts/");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "published" | "draft">("");

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (p) => (!status || p.status === status) && p.title.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")),
      ),
    [data, query, status],
  );

  async function setPostStatus(p: PostSummary, next: "published" | "draft") {
    try {
      await adminFetch(`/api/posts/${encodeURIComponent(p.slug)}/`, { method: "PATCH", json: { status: next } });
      toast.success(next === "published" ? `“${p.title}” yayınlandı.` : `“${p.title}” taslağa alındı.`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(p: PostSummary) {
    if (!confirm(`“${p.title}” silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await adminFetch(`/api/posts/${encodeURIComponent(p.slug)}/`, { method: "DELETE" });
      toast.success("Yazı silindi.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara..." aria-label="Yazılarda ara" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Durum süzgeci">
          <option value="">Tüm durumlar</option>
          <option value="published">Yayında</option>
          <option value="draft">Taslak</option>
        </select>
        <Link href="/admin/posts/new" className="btn primary" style={{ marginLeft: "auto" }}>Yeni yazı</Link>
      </div>
      {error && <p className="admin-error">{error.message}</p>}
      {loading && <p className="muted">Yükleniyor…</p>}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Başlık</th><th>Durum</th><th>Yayın tarihi</th><th style={{ textAlign: "right" }}>İşlemler</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="name">
                    <div className="cell-thumb">
                      {p.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb-sm" src={p.cover_url} alt="" />
                      ) : <span className="thumb-sm" aria-hidden />}
                      <Link href={`/admin/posts/${encodeURIComponent(p.slug)}`}>{p.title}</Link>
                    </div>
                  </td>
                  <td><span className={`badge ${p.status}`}>{p.status === "published" ? "Yayında" : "Taslak"}</span></td>
                  <td className="muted">{p.published_at ? formatDate(p.published_at) : "—"}</td>
                  <td>
                    <div className="actions">
                      <Link className="btn small" href={`/admin/posts/${encodeURIComponent(p.slug)}`}>Düzenle</Link>
                      {p.status === "published" ? (
                        <>
                          <Link className="btn small" href={`/yazilar/${encodeURIComponent(p.slug)}`} target="_blank">Sitede gör</Link>
                          <button className="btn small" onClick={() => setPostStatus(p, "draft")}>Taslağa al</button>
                        </>
                      ) : (
                        <button className="btn small" onClick={() => setPostStatus(p, "published")}>Yayınla</button>
                      )}
                      <button className="btn small danger" onClick={() => remove(p)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="muted" style={{ textAlign: "center", padding: 32 }}>{data.length === 0 ? "Henüz yazı yok." : "Aramaya uyan yazı bulunamadı."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
