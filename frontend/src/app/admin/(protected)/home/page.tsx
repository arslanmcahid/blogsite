"use client";

import { useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { HomeLayout, HomeSection } from "@/lib/types";

const LABELS: Record<HomeSection["type"], string> = {
  featured_post: "Öne çıkan yazı (en yeni yazı)",
  latest_posts: "Son yazılar",
  gallery_showcase: "Sergi vitrini",
  map: "Konum haritası",
  text: "Serbest metin",
};
const HAS_LIMIT: HomeSection["type"][] = ["latest_posts", "gallery_showcase"];

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

function HomeForm({ initial }: { initial: HomeSection[] }) {
  const [sections, setSections] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<HomeSection>) => setSections(sections.map((s, j) => (j === i ? { ...s, ...p } : s)));

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      // Boş alanları göndermeyelim (backend limit için 1-50 arası sayı bekler).
      const clean = sections.map((s) => {
        const out: HomeSection = { type: s.type };
        if (s.title?.trim()) out.title = s.title.trim();
        if (HAS_LIMIT.includes(s.type) && s.limit) out.limit = s.limit;
        if (s.type === "text") out.markdown = s.markdown ?? "";
        return out;
      });
      await adminFetch<HomeLayout>("/api/home/", { method: "PUT", json: { sections: clean } });
      setMsg({ ok: true, text: "Ana sayfa düzeni kaydedildi." });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor">
      <div className="toolbar">
        <h1>Ana sayfa düzeni</h1>
        <span className="spacer" />
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>
      {msg && <p className={msg.ok ? "admin-ok" : "admin-error"} role="status">{msg.text}</p>}
      <p className="muted small">Bölümler ana sayfada yukarıdan aşağıya bu sırayla görünür.</p>

      <div className="blocklist">
        {sections.map((s, i) => (
          <div className="block" key={i}>
            <div className="block-head">
              <strong>{LABELS[s.type]}</strong>
              <span className="spacer" />
              <button type="button" className="icon" disabled={i === 0} onClick={() => setSections(move(sections, i, i - 1))} title="Yukarı">↑</button>
              <button type="button" className="icon" disabled={i === sections.length - 1} onClick={() => setSections(move(sections, i, i + 1))} title="Aşağı">↓</button>
              <button type="button" className="icon danger" onClick={() => setSections(sections.filter((_, j) => j !== i))} title="Kaldır">✕</button>
            </div>
            <div className="grid2">
              <label>Bölüm başlığı<input value={s.title ?? ""} onChange={(e) => patch(i, { title: e.target.value })} /></label>
              {HAS_LIMIT.includes(s.type) && (
                <label>Kaç öğe gösterilsin (1-50)
                  <input type="number" min={1} max={50} value={s.limit ?? ""} onChange={(e) => patch(i, { limit: e.target.value ? Number(e.target.value) : undefined })} />
                </label>
              )}
            </div>
            {s.type === "text" && (
              <label>Metin (Markdown)<textarea rows={5} value={s.markdown ?? ""} onChange={(e) => patch(i, { markdown: e.target.value })} /></label>
            )}
          </div>
        ))}
        <div className="add-row">
          <span className="small muted">Bölüm ekle:</span>
          {(Object.keys(LABELS) as HomeSection["type"][]).map((t) => (
            <button type="button" key={t} className="btn small" onClick={() => setSections([...sections, { type: t }])}>+ {LABELS[t]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomeAdminPage() {
  const { data, error } = useApi<HomeLayout>("/api/home/");
  if (error) return <p className="admin-error">{error.message}</p>;
  if (!data) return <p className="muted">Yükleniyor…</p>;
  return <HomeForm initial={data.sections} />;
}
