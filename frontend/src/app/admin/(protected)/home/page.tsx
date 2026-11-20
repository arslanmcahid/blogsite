"use client";

import { ChevronDown, ChevronUp, MessageSquare, Images, MapPin, Newspaper, Star, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DragHandle, SortableList } from "@/components/admin/Sortable";
import { useToast } from "@/components/admin/Toast";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { newId } from "@/lib/editor-model";
import type { HomeLayout, HomeSection } from "@/lib/types";

const INFO: Record<HomeSection["type"], { label: string; icon: LucideIcon; hint: string }> = {
  featured_post: { label: "Öne çıkan yazı", icon: Star, hint: "En yeni yazın büyük kartla gösterilir." },
  latest_posts: { label: "Son yazılar", icon: Newspaper, hint: "En yeni yazıların küçük kartları." },
  gallery_showcase: { label: "Sergi vitrini", icon: Images, hint: "Fotoğraf sergilerin." },
  map: { label: "Gezi haritası", icon: MapPin, hint: "Tüm konum etiketlerin tek haritada." },
  text: { label: "Serbest yazı", icon: MessageSquare, hint: "Karşılama mesajı gibi kısa bir metin." },
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
  const move = (from: number, to: number) =>
    setSections((l) => {
      if (to < 0 || to >= l.length) return l;
      const n = [...l];
      n.splice(to, 0, n.splice(from, 1)[0]);
      return n;
    });

  async function save() {
    if (busy) return;
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

  return (
    <div>
      <div className="form-head">
        <span className="muted">Bölümler ana sayfada yukarıdan aşağıya bu sırayla görünür. Tutacaktan sürükleyerek sıralayabilirsin.</span>
        <span className="spacer" />
        <span className="state">{dirty ? "Kaydedilmemiş değişiklikler var" : ""}</span>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>

      <div className="form-grid">
        <div className="form-main">
          <SortableList items={sections} onChange={setSections} className="blocklist">
            {(s, i, handle, dragging) => {
              const Icon = INFO[s.type].icon;
              return (
                <section className={`block ${dragging ? "dragging" : ""}`}>
                  <div className="block-head">
                    <DragHandle handle={handle} label={`${INFO[s.type].label} bölümünü sürükle`} />
                    <Icon size={16} className="kind" aria-hidden />
                    <strong>{INFO[s.type].label}</strong>
                    <span className="muted small">{INFO[s.type].hint}</span>
                    <span className="spacer" />
                    <button type="button" className="icon" aria-label="Yukarı taşı" title="Yukarı taşı" disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronUp size={16} /></button>
                    <button type="button" className="icon" aria-label="Aşağı taşı" title="Aşağı taşı" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}><ChevronDown size={16} /></button>
                    <button type="button" className="icon danger" aria-label="Bu bölümü kaldır" title="Ana sayfadan kaldır" onClick={() => setSections((l) => l.filter((x) => x.id !== s.id))}><Trash2 size={15} /></button>
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
              );
            }}
          </SortableList>
          {sections.length === 0 && <div className="empty-state">Ana sayfan şu an boş. Sağdan bölüm ekle.</div>}
        </div>

        <aside className="form-side">
          <div className="card stack">
            <h2>Bölüm ekle</h2>
            <div className="palette">
              {(Object.keys(INFO) as HomeSection["type"][]).map((t) => {
                const Icon = INFO[t].icon;
                return (
                  <button type="button" key={t} className="palette-item" title={INFO[t].hint} onClick={() => setSections((l) => [...l, { id: newId(), type: t }])}>
                    <Icon size={15} aria-hidden /> {INFO[t].label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
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
