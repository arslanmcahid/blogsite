"use client";

import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { ctr } from "@/lib/ads";
import { AD_PLACEMENTS, type Ad, type AdFormat, type AdPlacement, type AdStats, type AdminImage } from "@/lib/types";
import { AdCard } from "../AdCard";
import { BannerCrop } from "./BannerCrop";
import { ImagePicker } from "./ImagePicker";
import { useToast } from "./Toast";

type Draft = {
  name: string;
  kind: "banner" | "text";
  image: { id: number; url: string; w: number | null; h: number | null; autoX: number; autoY: number } | null;
  title: string;
  body: string;
  cta: string;
  link_url: string;
  placements: AdPlacement[];
  weight: number;
  format: AdFormat;
  focus: { x: number; y: number } | null; // null = otomatik
  is_active: boolean;
  starts_on: string;
  ends_on: string;
};

const blank: Draft = { name: "", kind: "banner", image: null, title: "", body: "", cta: "", link_url: "", placements: ["home", "post_end"], weight: 1, format: "auto", focus: null, is_active: true, starts_on: "", ends_on: "" };

const fromAd = (a: Ad): Draft => ({
  name: a.name, kind: a.kind, image: a.image && a.image_url ? { id: a.image, url: a.image_url, w: a.image_width, h: a.image_height, autoX: a.auto_focus_x ?? 50, autoY: a.auto_focus_y ?? 50 } : null,
  title: a.title, body: a.body, cta: a.cta, link_url: a.link_url, placements: a.placements, weight: a.weight, format: a.format, focus: a.focus_x !== null && a.focus_y !== null ? { x: a.focus_x, y: a.focus_y } : null, is_active: a.is_active,
  starts_on: a.starts_on ?? "", ends_on: a.ends_on ?? "",
});

const payload = (d: Draft) => ({
  name: d.name.trim(), kind: d.kind, image: d.image?.id ?? null, title: d.title.trim(), body: d.body.trim(), cta: d.cta.trim(),
  link_url: d.link_url.trim(), placements: d.placements, weight: d.weight, format: d.format, focus_x: d.focus?.x ?? null, focus_y: d.focus?.y ?? null, is_active: d.is_active,
  starts_on: d.starts_on || null, ends_on: d.ends_on || null,
});

/* ---------- Rapor ---------- */

const GROUPS = [{ id: "day", label: "Günlük" }, { id: "week", label: "Haftalık" }, { id: "month", label: "Aylık" }] as const;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function periodLabel(p: string, group: AdStats["group"]): string {
  const d = new Date(p + "T00:00:00");
  if (group === "month") return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  if (group === "week") {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function Report({ ad }: { ad: Ad }) {
  const [group, setGroup] = useState<AdStats["group"]>("day");
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const { data, error, loading } = useApi<AdStats>(`/api/ads/${ad.id}/stats/?group=${group}&from=${from}&to=${to}`);
  const max = Math.max(1, ...(data?.rows.map((r) => r.views) ?? [1]));

  function csv() {
    if (!data) return;
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [["Dönem", "Gösterim", "Tıklama", "Tıklama oranı"].map(q).join(";")];
    for (const r of data.rows) lines.push([periodLabel(r.period, data.group), r.views, r.clicks, ctr(r.views, r.clicks)].map(q).join(";"));
    lines.push(["Toplam", data.totals.views, data.totals.clicks, ctr(data.totals.views, data.totals.clicks)].map(q).join(";"));
    // BOM: Excel Türkçe karakterleri doğru açsın
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reklam-raporu-${ad.name.toLocaleLowerCase("tr").replace(/[^a-z0-9ığüşöç]+/gi, "-")}-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="card stack">
      <div className="row">
        <div>
          <h2>Rapor</h2>
          <p className="muted small" style={{ margin: 0 }}>Reklamverene gösterebileceğin gösterim ve tıklama sayıları. Botlar ve senin kendi tıklamaların sayılmaz.</p>
        </div>
        <span className="spacer" />
        <button type="button" className="btn small" onClick={csv} disabled={!data || data.rows.length === 0}><Download size={14} aria-hidden /> Excel (CSV) indir</button>
      </div>
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <div className="tabs" role="tablist" aria-label="Dönem">
          {GROUPS.map((g) => <button key={g.id} role="tab" aria-selected={group === g.id} className={group === g.id ? "on" : ""} onClick={() => setGroup(g.id)}>{g.label}</button>)}
        </div>
        <label className="inline-label">Başlangıç <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline-label">Bitiş <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {error && <p className="admin-error">{error.message}</p>}
      {loading && !data && <p className="muted">Yükleniyor…</p>}
      {data && (
        <>
          <div className="stat-row">
            <div><span>Gösterim</span><strong>{data.totals.views.toLocaleString("tr-TR")}</strong></div>
            <div><span>Tıklama</span><strong>{data.totals.clicks.toLocaleString("tr-TR")}</strong></div>
            <div><span>Tıklama oranı</span><strong>{ctr(data.totals.views, data.totals.clicks)}</strong></div>
          </div>
          {data.rows.length === 0 ? (
            <p className="muted">Bu tarih aralığında henüz gösterim yok.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Dönem</th><th style={{ width: "34%" }} aria-label="Gösterim grafiği" /><th style={{ textAlign: "right" }}>Gösterim</th><th style={{ textAlign: "right" }}>Tıklama</th><th style={{ textAlign: "right" }}>Oran</th></tr></thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.period}>
                      <td>{periodLabel(r.period, data.group)}</td>
                      <td><div className="bar"><span style={{ width: `${(r.views / max) * 100}%` }} /></div></td>
                      <td style={{ textAlign: "right" }}>{r.views.toLocaleString("tr-TR")}</td>
                      <td style={{ textAlign: "right" }}>{r.clicks.toLocaleString("tr-TR")}</td>
                      <td style={{ textAlign: "right" }} className="muted">{ctr(r.views, r.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.by_placement.length > 0 && (
            <p className="muted small" style={{ margin: 0 }}>
              Yerlere göre:{" "}
              {data.by_placement.map((p) => `${AD_PLACEMENTS.find((x) => x.id === p.placement)?.label ?? p.placement}: ${p.views.toLocaleString("tr-TR")} gösterim, ${p.clicks.toLocaleString("tr-TR")} tıklama`).join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Form ---------- */

function AdForm({ ad, onSaved }: { ad: Ad | null; onSaved: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const id = ad?.id ?? null;
  const [draft, setDraft] = useState<Draft>(() => (ad ? fromAd(ad) : blank));
  const [saved, setSaved] = useState(() => JSON.stringify(payload(ad ? fromAd(ad) : blank)));
  const [saving, setSaving] = useState(false);
  const update = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = JSON.stringify(payload(draft)) !== saved;

  async function save() {
    if (saving) return;
    const d = draft;
    if (!d.name.trim()) return toast.error("Reklamverenin ya da kampanyanın adını yaz.");
    if (!d.link_url.trim()) return toast.error("Reklamın gideceği bağlantıyı yaz.");
    if (d.kind === "banner" && !d.image) return toast.error("Afiş için bir görsel seç.");
    if (d.kind === "text" && !d.title.trim()) return toast.error("Metinli kart için bir başlık yaz.");
    const link = /^https?:\/\//.test(d.link_url.trim()) ? d.link_url.trim() : `https://${d.link_url.trim()}`;
    setSaving(true);
    try {
      const body = { ...payload(d), link_url: link };
      const res = id
        ? await adminFetch<Ad>(`/api/ads/${id}/`, { method: "PATCH", json: body })
        : await adminFetch<Ad>("/api/ads/", { method: "POST", json: body });
      setDraft((cur) => ({ ...cur, link_url: link }));
      setSaved(JSON.stringify(payload({ ...d, link_url: link })));
      toast.success("Reklam kaydedildi.");
      // Sayfa kaydedilen veriyle baştan yüklenir.
      window.scrollTo({ top: 0 });
      if (!id) router.replace(`/admin/ads/${res.id}`);
      else onSaved();
    } catch (e) {
      toast.error(`Kaydedilemedi: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  }

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const togglePlacement = (p: AdPlacement) =>
    update({ placements: draft.placements.includes(p) ? draft.placements.filter((x) => x !== p) : [...draft.placements, p] });

  const preview = useMemo(
    () => ({ kind: draft.kind, name: draft.name || "Reklamveren", title: draft.title, body: draft.body, cta: draft.cta, image_url: draft.image?.url ?? null, image_width: draft.image?.w ?? null, image_height: draft.image?.h ?? null, format: draft.format, focus_x: draft.focus?.x ?? draft.image?.autoX ?? 50, focus_y: draft.focus?.y ?? draft.image?.autoY ?? 50 }),
    [draft],
  );

  async function remove() {
    if (!id || !confirm("Bu reklam ve tüm istatistikleri silinsin mi? Bu işlem geri alınamaz.")) return;
    try {
      await adminFetch(`/api/ads/${id}/`, { method: "DELETE" });
      toast.success("Reklam silindi.");
      router.replace("/admin/ads");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const pickImage = (img: AdminImage) => update({ image: { id: img.id, url: img.url, w: img.width, h: img.height, autoX: img.focus_x ?? 50, autoY: img.focus_y ?? 50 }, focus: null });

  return (
    <div>
      <div className="form-head">
        <Link href="/admin/ads" className="back"><ArrowLeft size={16} aria-hidden /> Reklamlar</Link>
        <span className="state">{saving ? "Kaydediliyor…" : dirty ? "Kaydedilmemiş değişiklikler var" : id ? "Tüm değişiklikler kaydedildi" : ""}</span>
        <span className="spacer" />
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>

      <div className="form-grid">
        <div className="form-main">
          <div className="card stack">
            <div className="tabs" role="tablist" aria-label="Reklam türü" style={{ alignSelf: "flex-start" }}>
              <button role="tab" aria-selected={draft.kind === "banner"} className={draft.kind === "banner" ? "on" : ""} onClick={() => update({ kind: "banner" })}>Afiş</button>
              <button role="tab" aria-selected={draft.kind === "text"} className={draft.kind === "text" ? "on" : ""} onClick={() => update({ kind: "text" })}>Metinli kart</button>
            </div>
            <label>Reklamveren / kampanya adı * <span className="muted">(kartta “Reklam · …” olarak görünür)</span>
              <input value={draft.name} onChange={(e) => update({ name: e.target.value })} maxLength={120} placeholder="Örn. Köşe Kafe" />
            </label>
            <label>Tıklanınca gidilecek bağlantı *
              <input value={draft.link_url} onChange={(e) => update({ link_url: e.target.value })} inputMode="url" placeholder="https://reklamveren.com/kampanya" />
            </label>
          </div>

          <div className="card stack">
            <h2>{draft.kind === "banner" ? "Afiş görseli *" : "Kart içeriği"}</h2>
            {draft.kind === "banner" && <p className="muted small" style={{ margin: 0 }}>Yatay (örn. 728×90 ya da 970×250) ya da kare (300×250) görseller iyi durur. Görselin oranı korunur.</p>}
            {draft.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="thumb" src={draft.image.url} alt="" />
            )}
            <div className="row">
              <ImagePicker label={draft.image ? "Görseli değiştir" : draft.kind === "banner" ? "Görsel seç" : "Küçük görsel ekle (isteğe bağlı)"} onPick={pickImage} />
              {draft.image && <button type="button" className="btn" onClick={() => update({ image: null })}>Kaldır</button>}
            </div>
            {draft.kind === "text" && (
              <>
                <label>Başlık *<input value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={120} /></label>
                <label>Açıklama <textarea rows={2} value={draft.body} onChange={(e) => update({ body: e.target.value })} maxLength={300} /></label>
                <label>Düğme yazısı <span className="muted">(isteğe bağlı)</span><input value={draft.cta} onChange={(e) => update({ cta: e.target.value })} maxLength={40} placeholder="Örn. Menüyü gör" /></label>
              </>
            )}
            {draft.kind === "banner" && (
              <label>Görsel açıklaması <span className="muted">(ekran okuyucular için)</span><input value={draft.title} onChange={(e) => update({ title: e.target.value })} maxLength={120} /></label>
            )}
          </div>

          {draft.kind === "banner" && draft.image && (
            <BannerCrop
              image={draft.image}
              placements={draft.placements}
              format={draft.format}
              focus={draft.focus}
              onChange={(p) => update({ ...(p.format !== undefined ? { format: p.format } : {}), ...(p.focus !== undefined ? { focus: p.focus } : {}) })}
            />
          )}

          {id && ad && <Report ad={ad} />}
        </div>

        <aside className="form-side">
          <div className="card stack">
            <h2>Yayın</h2>
            <label>Durum
              <select value={draft.is_active ? "on" : "off"} onChange={(e) => update({ is_active: e.target.value === "on" })}>
                <option value="on">Açık (tarihleri gelince yayınlanır)</option>
                <option value="off">Duraklatıldı</option>
              </select>
            </label>
            <label>Başlangıç tarihi <span className="muted">(boşsa hemen)</span><input type="date" value={draft.starts_on} onChange={(e) => update({ starts_on: e.target.value })} /></label>
            <label>Bitiş tarihi <span className="muted">(bu gün dahil, boşsa süresiz)</span><input type="date" value={draft.ends_on} min={draft.starts_on || undefined} onChange={(e) => update({ ends_on: e.target.value })} /></label>
            <p className="muted small" style={{ margin: 0 }}>Süresi dolan reklam kendiliğinden sitede görünmez olur.</p>
          </div>

          <div className="card stack">
            <h2>Nerede görünsün?</h2>
            <div className="stack" style={{ gap: 8 }}>
              {AD_PLACEMENTS.map((p) => (
                <label key={p.id} className="check">
                  <input type="checkbox" checked={draft.placements.includes(p.id)} onChange={() => togglePlacement(p.id)} />
                  <span><strong>{p.label}</strong><span className="muted small"> {p.hint}</span></span>
                </label>
              ))}
            </div>
            <label>Gösterilme ağırlığı
              <select value={draft.weight} onChange={(e) => update({ weight: Number(e.target.value) })}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}{n === 1 ? " (normal)" : n >= 5 ? " (çok sık)" : ""}</option>)}
              </select>
            </label>
            <p className="muted small" style={{ margin: 0 }}>Aynı yere birden çok reklam atarsan ağırlığa göre dönerler: hepsi 1 ise eşit, birinin ağırlığı 3 ise diğerlerinden yaklaşık 3 kat sık çıkar.</p>
          </div>

          <div className="card stack">
            <h2>Önizleme</h2>
            <div className="preview-frame" style={{ padding: 16 }}>
              {(draft.placements.length ? draft.placements : (["post_end"] as AdPlacement[])).map((p) => (
                <div key={p} className="ad-prev">
                  <span className="muted small">{AD_PLACEMENTS.find((x) => x.id === p)?.label}</span>
                  <div className="ad-slot" style={{ margin: 0, maxWidth: p.startsWith("side") ? 200 : undefined }}><span style={{ display: "block" }}><AdCard ad={preview} placement={p} /></span></div>
                </div>
              ))}
            </div>
          </div>

          {id && (
            <div className="card stack">
              <h2>Reklamı sil</h2>
              <p className="muted small" style={{ margin: 0 }}>Reklam ve istatistikleri silinir. Geçici olarak kaldırmak için “Duraklatıldı”yı seç.</p>
              <div><button type="button" className="btn danger" onClick={remove}>Bu reklamı sil</button></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function AdEditor({ id }: { id?: string }) {
  const ad = useApi<Ad>(id ? `/api/ads/${id}/` : null);
  if (ad.error) return <p className="admin-error">{ad.error.message}</p>;
  if (id && !ad.data) return <p className="muted">Yükleniyor…</p>;
  return <AdForm key={`${id ?? "new"}:${JSON.stringify(ad.data ?? null)}`} onSaved={ad.reload} ad={ad.data ?? null} />;
}
