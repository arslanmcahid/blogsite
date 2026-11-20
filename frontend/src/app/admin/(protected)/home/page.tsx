"use client";

import { useEffect, useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { newId } from "@/lib/editor-model";
import type { HomeLayout, HomeSection } from "@/lib/types";
import { DragHandle, SortableList } from "@/components/admin/Sortable";
import { useToast } from "@/components/admin/Toast";

const INFO: Record<HomeSection["type"], { label: string; emoji: string; hint: string }> = {
  featured_post: { label: "Öne çıkan yazı", emoji: "⭐", hint: "En yeni yazın büyük kartla gösterilir." },
  latest_posts: { label: "Son yazılar", emoji: "📰", hint: "En yeni yazıların küçük kartları." },
  gallery_showcase: { label: "Sergi vitrini", emoji: "🎞️", hint: "Fotoğraf sergilerin." },
  map: { label: "Gezi haritası", emoji: "📍", hint: "Tüm konum etiketlerin tek haritada." },
  text: { label: "Serbest yazı", emoji: "💬", hint: "Karşılama mesajı gibi kısa bir metin." },
};
const HAS_LIMIT: HomeSection["type"][] = ["latest_posts", "gallery_showcase"];

type Item = HomeSection & { id: string };

function HomeForm({ initial }: { initial: HomeSection[] }) {
  const toast = useToast();
  const [sections, setSections] = useState<Item[]>(() => initial.map((s) => ({ ...s, id: newId() })));
  const [busy, setBusy] = useState(false);

  const clean = (list: Item[]): HomeSection[] =>
    list.map((s) => {
      const out: HomeSection = { type: s.type };
      if (s.title?.trim()) out.title = s.title.trim();
      if (HAS_LIMIT.includes(s.type) && s.limit) out.limit = s.limit;
      if (s.type === "text") out.markdown = s.markdown ?? "";
      return out;
    });

  const snapshot = JSON.stringify(clean(sections));
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const patch = (id: string, p: Partial<HomeSection>) => setSections((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));

  async function save() {
    setBusy(true);
    try {
      await adminFetch<HomeLayout>("/api/home/", { method: "PUT", json: { sections: clean(sections) } });
      setSaved(snapshot);
      toast.success("Ana sayfa düzeni kaydedildi.", { label: "Sitede gör", onClick: () => window.open("/", "_blank") });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor">
      <div className="toolbar">
        <h1>Ana sayfa düzeni</h1>
        <span className="spacer" />
        <span className="save-state">{dirty ? "Kaydedilmemiş değişiklikler var" : ""}</span>
        <button className="btn primary" onClick={save} disabled={busy || !dirty}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>
      <p className="muted">Ana sayfanda görünecek bölümleri istediğin sırayla diz. Bir bölümü ⠿ simgesinden tutup sürükleyebilirsin.</p>

      <SortableList items={sections} onChange={setSections} className="blocklist">
        {(s, i, handle, dragging) => (
          <section className={`block ${dragging ? "dragging" : ""}`} style={{ marginBottom: "0.8rem" }}>
            <div className="block-head">
              <DragHandle handle={handle} label={`${INFO[s.type].label} bölümünü sürükle`} />
              <span aria-hidden>{INFO[s.type].emoji}</span>
              <strong>{INFO[s.type].label}</strong>
              <span className="muted small">{INFO[s.type].hint}</span>
              <span className="spacer" />
              <button type="button" className="icon" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => setSections((l) => { const n = [...l]; n.splice(i - 1, 0, n.splice(i, 1)[0]); return n; })}>↑</button>
              <button type="button" className="icon" aria-label="Aşağı taşı" disabled={i === sections.length - 1} onClick={() => setSections((l) => { const n = [...l]; n.splice(i + 1, 0, n.splice(i, 1)[0]); return n; })}>↓</button>
              <button type="button" className="icon danger" aria-label="Bu bölümü kaldır" title="Ana sayfadan kaldır" onClick={() => setSections((l) => l.filter((x) => x.id !== s.id))}>🗑</button>
            </div>
            <div className="grid2">
              <label>Bölüm başlığı <span className="muted">(boş bırakabilirsin)</span><input value={s.title ?? ""} onChange={(e) => patch(s.id, { title: e.target.value })} /></label>
              {HAS_LIMIT.includes(s.type) && (
                <label>Kaç tane gösterilsin?
                  <input type="number" min={1} max={50} value={s.limit ?? ""} placeholder="Varsayılan" onChange={(e) => patch(s.id, { limit: e.target.value ? Number(e.target.value) : undefined })} />
                </label>
              )}
            </div>
            {s.type === "text" && (
              <label>Mesajın<textarea rows={4} value={s.markdown ?? ""} onChange={(e) => patch(s.id, { markdown: e.target.value })} placeholder="Örn. Merhaba! Burası gezi notlarımı ve fotoğraflarımı paylaştığım yer." /></label>
            )}
          </section>
        )}
      </SortableList>
      {sections.length === 0 && <div className="empty-state"><span className="emoji">🧭</span>Ana sayfan şu an boş. Aşağıdan bölüm ekle.</div>}

      <div className="panel stack">
        <h2>Bölüm ekle</h2>
        <div className="palette">
          {(Object.keys(INFO) as HomeSection["type"][]).map((t) => (
            <button type="button" key={t} className="palette-item" onClick={() => setSections((l) => [...l, { id: newId(), type: t }])}>
              <span className="emoji" aria-hidden>{INFO[t].emoji}</span>
              <strong>{INFO[t].label}</strong>
              <span className="hint">{INFO[t].hint}</span>
            </button>
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
