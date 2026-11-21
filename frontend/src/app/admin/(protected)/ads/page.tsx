"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/components/admin/Toast";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { ctr, periodText, STATUS_LABEL } from "@/lib/ads";
import { AD_PLACEMENTS, type Ad } from "@/lib/types";

export default function AdsAdminPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<Ad[]>("/api/ads/");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | Ad["status"]>("");

  const rows = useMemo(
    () => (data ?? []).filter((a) => (!status || a.status === status) && `${a.name} ${a.title}`.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr"))),
    [data, query, status],
  );

  async function toggle(a: Ad) {
    try {
      await adminFetch(`/api/ads/${a.id}/`, { method: "PATCH", json: { is_active: !a.is_active } });
      toast.success(a.is_active ? `“${a.name}” duraklatıldı.` : `“${a.name}” yeniden yayına alındı.`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(a: Ad) {
    if (!confirm(`“${a.name}” reklamı ve tüm istatistikleri silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await adminFetch(`/api/ads/${a.id}/`, { method: "DELETE" });
      toast.success("Reklam silindi.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ara..." aria-label="Reklamlarda ara" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Durum süzgeci">
          <option value="">Tüm durumlar</option>
          {(Object.keys(STATUS_LABEL) as Ad["status"][]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <Link href="/admin/ads/new" data-tour="new-ad" className="btn primary" style={{ marginLeft: "auto" }}>Yeni reklam</Link>
      </div>
      {error && <p className="admin-error">{error.message}</p>}
      {loading && <p className="muted">Yükleniyor…</p>}
      {data && data.length === 0 && (
        <div className="empty-state"><p>Henüz reklam yok. Elden aldığın bir reklamı “Yeni reklam”la ekleyebilirsin.</p></div>
      )}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Reklam</th><th>Yerler</th><th>Dönem</th><th>Durum</th><th style={{ textAlign: "right" }}>Gösterim</th><th style={{ textAlign: "right" }}>Tıklama</th><th style={{ textAlign: "right" }}>Oran</th><th style={{ textAlign: "right" }}>İşlemler</th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="name">
                    <div className="cell-thumb">
                      {a.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb-sm" src={a.image_url} alt="" />
                      ) : <span className="thumb-sm" aria-hidden />}
                      <div>
                        <Link href={`/admin/ads/${a.id}`}>{a.name}</Link>
                        <div className="muted small">{a.kind === "banner" ? "Afiş" : "Metinli kart"}{a.title ? ` · ${a.title}` : ""}</div>
                      </div>
                    </div>
                  </td>
                  <td className="muted">{a.placements.length ? a.placements.map((p) => AD_PLACEMENTS.find((x) => x.id === p)?.label).join(", ") : "—"}</td>
                  <td className="muted">{periodText(a)}</td>
                  <td><span className={`badge ad-${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                  <td style={{ textAlign: "right" }}>{(a.views ?? 0).toLocaleString("tr-TR")}</td>
                  <td style={{ textAlign: "right" }}>{(a.clicks ?? 0).toLocaleString("tr-TR")}</td>
                  <td style={{ textAlign: "right" }} className="muted">{ctr(a.views, a.clicks)}</td>
                  <td>
                    <div className="actions">
                      <Link className="btn small" href={`/admin/ads/${a.id}`}>Düzenle</Link>
                      <button className="btn small" onClick={() => toggle(a)}>{a.is_active ? "Duraklat" : "Yayına al"}</button>
                      <button className="btn small danger" onClick={() => remove(a)}>Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 24 }}>Eşleşen reklam yok.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
