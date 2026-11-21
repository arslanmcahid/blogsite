"use client";

import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Images, MapPin, MessageSquare, Newspaper, Pencil, Plus, Star, Trash2, X, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { Markdown } from "@/components/Markdown";
import { SortableList, type HandleProps } from "@/components/admin/Sortable";
import { useToast } from "@/components/admin/Toast";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { newId } from "@/lib/editor-model";
import { formatDate } from "@/lib/format";
import type { GallerySummary, HomeLayout, HomeSection, Location, PostSummary } from "@/lib/types";

type Kind = HomeSection["type"];

const INFO: Record<Kind, { label: string; short: string; icon: LucideIcon; hint: string }> = {
  featured_post: { label: "Öne çıkan yazı", short: "Öne çıkan yazı", icon: Star, hint: "En yeni yazın büyük kartla gösterilir." },
  latest_posts: { label: "Son yazılar", short: "Son yazılar", icon: Newspaper, hint: "En yeni yazıların küçük kartları." },
  gallery_showcase: { label: "Sergi vitrini", short: "Sergiler", icon: Images, hint: "Fotoğraf sergilerin." },
  map: { label: "Gezi haritası", short: "Harita", icon: MapPin, hint: "Tüm konum etiketlerin tek haritada." },
  text: { label: "Serbest yazı", short: "Yazı kutusu", icon: MessageSquare, hint: "Karşılama mesajı gibi kısa bir metin." },
};
const HAS_LIMIT: Kind[] = ["latest_posts", "gallery_showcase"];

type Item = HomeSection & { id: string };
type Data = { posts: PostSummary[]; galleries: GallerySummary[]; locations: Location[] };

/* ---------- Canlı önizleme: bölümler sitedeki gibi görünür ---------- */

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hp-empty">{children}</p>;
}

function PostTile({ post, featured = false }: { post: PostSummary; featured?: boolean }) {
  return (
    <article className={featured ? "hp-card hp-card-featured" : "hp-card"}>
      {post.cover_url && (
        <div className="hp-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.cover_url} alt="" />
        </div>
      )}
      <div className="hp-card-body">
        {post.published_at && <time>{formatDate(post.published_at)}</time>}
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
      </div>
    </article>
  );
}

function SectionPreview({ s, data, featuredSlug }: { s: Item; data: Data; featuredSlug?: string }) {
  const posts = data.posts;
  switch (s.type) {
    case "featured_post":
      return (
        <>
          {s.title && <h2>{s.title}</h2>}
          {posts[0] ? <PostTile post={posts[0]} featured /> : <Empty>Yayında yazı olunca en yenisi burada büyük kartla görünecek.</Empty>}
        </>
      );
    case "latest_posts": {
      const list = posts.filter((p) => p.slug !== featuredSlug).slice(0, s.limit ?? 6);
      return (
        <>
          <h2>{s.title || "Son yazılar"}</h2>
          {list.length ? <div className="hp-grid">{list.map((p) => <PostTile key={p.id} post={p} />)}</div> : <Empty>Gösterilecek yayında yazı yok.</Empty>}
        </>
      );
    }
    case "gallery_showcase": {
      const list = data.galleries.filter((g) => g.is_published).slice(0, s.limit ?? 4);
      return (
        <>
          <h2>{s.title || "Sergiler"}</h2>
          {list.length ? (
            <div className="hp-grid">
              {list.map((g) => (
                <article key={g.id} className="hp-card">
                  {g.cover_url && (
                    <div className="hp-cover">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.cover_url} alt="" />
                    </div>
                  )}
                  <div className="hp-card-body"><h3>{g.title}</h3></div>
                </article>
              ))}
            </div>
          ) : (
            <Empty>Yayında sergi olunca burada görünecek.</Empty>
          )}
        </>
      );
    }
    case "map":
      return (
        <>
          <h2>{s.title || "Gittiğim yerler"}</h2>
          {data.locations.length ? <MapView locations={data.locations} height={260} /> : <Empty>Konum ekleyince harita burada görünecek.</Empty>}
        </>
      );
    case "text":
      return s.markdown?.trim() ? <Markdown>{s.markdown}</Markdown> : <Empty>Bu kutu boş. Kalem düğmesine basıp mesajını yaz.</Empty>;
  }
}

/* ---------- Düzenleme penceresi ---------- */

function EditDialog({ item, onChange, onClose }: { item: Item; onChange: (p: Partial<HomeSection>) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d || d.open) return;
    d.showModal();
    // showModal ilk düğmeye odaklanır; yazmaya hemen başlayabilsin diye ilk alana odaklan.
    d.querySelector<HTMLElement>("textarea, input")?.focus();
  }, []);
  const info = INFO[item.type];
  return (
    <dialog ref={ref} className="hp-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <form method="dialog" className="stack">
        <div className="hp-dialog-head">
          <info.icon size={18} aria-hidden />
          <h2>{info.label}</h2>
          <button type="button" className="icon" aria-label="Kapat" onClick={() => ref.current?.close()}><X size={16} /></button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>{info.hint}</p>
        {item.type !== "text" && (
          <label>Bölüm başlığı <span className="muted">(boş bırakırsan varsayılan başlık görünür)</span>
            <input value={item.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} placeholder={item.type === "featured_post" ? "Başlık göstermeyebilirsin" : undefined} />
          </label>
        )}
        {HAS_LIMIT.includes(item.type) && (
          <label>Kaç tane gösterilsin?
            <input type="number" min={1} max={50} value={item.limit ?? ""} placeholder="Varsayılan" onChange={(e) => onChange({ limit: e.target.value ? Number(e.target.value) : undefined })} />
          </label>
        )}
        {item.type === "text" && (
          <label>Mesajın
            <textarea rows={6} value={item.markdown ?? ""} onChange={(e) => onChange({ markdown: e.target.value })} placeholder="Örn. Merhaba! Burası gezi notlarımı ve fotoğraflarımı paylaştığım yer." />
          </label>
        )}
        <div className="hp-dialog-foot">
          <button type="submit" className="btn primary">Tamam</button>
        </div>
      </form>
    </dialog>
  );
}

/* ---------- Ana editör ---------- */

function HomeForm({ initial, data }: { initial: HomeSection[]; data: Data }) {
  const toast = useToast();
  const [sections, setSections] = useState<Item[]>(() => initial.map((s) => ({ ...s, id: newId() })));
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastAdded = useRef<string | null>(null);

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

  // Yeni eklenen bölüme kaydır.
  useEffect(() => {
    if (!lastAdded.current) return;
    document.getElementById(`hp-${lastAdded.current}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    lastAdded.current = null;
  }, [sections.length]);

  const patch = (id: string, p: Partial<HomeSection>) => setSections((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const move = (from: number, to: number) =>
    setSections((l) => {
      if (to < 0 || to >= l.length) return l;
      const n = [...l];
      n.splice(to, 0, n.splice(from, 1)[0]);
      return n;
    });

  function add(type: Kind) {
    const item: Item = { id: newId(), type };
    lastAdded.current = item.id;
    setSections((l) => [...l, item]);
    if (type === "text") setEditing(item.id);
    else toast.info(`“${INFO[type].label}” en alta eklendi.`);
  }

  function remove(index: number) {
    const gone = sections[index];
    setSections((l) => l.filter((x) => x.id !== gone.id));
    toast.info(`“${INFO[gone.type].label}” ana sayfadan kaldırıldı.`, {
      label: "Geri al",
      onClick: () => setSections((l) => { const n = [...l]; n.splice(Math.min(index, n.length), 0, gone); return n; }),
    });
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await adminFetch<HomeLayout>("/api/home/", { method: "PUT", json: { sections: clean(sections) } });
      setSaved(snapshot);
      toast.success("Ana sayfa kaydedildi.", { label: "Sitede gör", onClick: () => window.open("/", "_blank") });
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

  const featuredSlug = sections.some((s) => s.type === "featured_post") ? data.posts[0]?.slug : undefined;
  const editingItem = sections.find((s) => s.id === editing);

  const tools = (i: number, s: Item, handle: HandleProps) => {
    const { ref, ...rest } = handle;
    return (
      <div className="hp-tools">
        <button type="button" className="hp-round" aria-label="Yukarı taşı" title="Yukarı taşı" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
        <button type="button" className="hp-round" aria-label="Aşağı taşı" title="Aşağı taşı" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
        <button type="button" ref={ref} className="hp-round hp-grab" aria-label="Sürükleyerek taşı" title="Tutup sürükle" {...rest}><GripVertical size={16} /></button>
        <button type="button" className="hp-round" aria-label={`${INFO[s.type].label} bölümünü düzenle`} title="Düzenle" onClick={() => setEditing(s.id)}><Pencil size={15} /></button>
        <button type="button" className="hp-round hp-del" aria-label={`${INFO[s.type].label} bölümünü kaldır`} title="Ana sayfadan kaldır" onClick={() => remove(i)}><Trash2 size={15} /></button>
      </div>
    );
  };

  return (
    <div className="hp">
      <div className="hp-bar">
        <div className="hp-add" role="group" aria-label="Bölüm ekle">
          <span className="hp-add-label"><Plus size={14} aria-hidden /> Bölüm ekle</span>
          {(Object.keys(INFO) as Kind[]).map((t) => {
            const Icon = INFO[t].icon;
            return (
              <button type="button" key={t} className="hp-pill" title={INFO[t].hint} onClick={() => add(t)}>
                <Icon size={14} aria-hidden /> {INFO[t].short}
              </button>
            );
          })}
        </div>
        <span className="spacer" />
        <span className="state">{dirty ? "Kaydedilmemiş değişiklikler var" : ""}</span>
        <a className="btn" href="/" target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden /> Sitede gör</a>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>

      <p className="muted hp-hint">Aşağıda ana sayfanın nasıl görüneceğini görüyorsun. Bölümün sağ üstündeki düğmelerle taşı, düzenle ya da kaldır. Bitince <strong>Kaydet</strong>’e bas.</p>

      <div className="hp-canvas">
        <SortableList items={sections} onChange={setSections} className="hp-list">
          {(s, i, handle, dragging) => (
            <section id={`hp-${s.id}`} className={`hp-frame ${dragging ? "dragging" : ""}`}>
              <span className="hp-tag">{INFO[s.type].label}</span>
              {tools(i, s, handle)}
              <div className="hp-body">
                <SectionPreview s={s} data={data} featuredSlug={featuredSlug} />
              </div>
            </section>
          )}
        </SortableList>
        {sections.length === 0 && (
          <div className="empty-state">
            <p>Ana sayfan şu an boş. Yukarıdaki düğmelerden bir bölüm ekleyerek başla.</p>
          </div>
        )}
      </div>

      {editingItem && <EditDialog item={editingItem} onChange={(p) => patch(editingItem.id, p)} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function HomeAdminPage() {
  const home = useApi<HomeLayout>("/api/home/");
  const posts = useApi<PostSummary[]>("/api/posts/");
  const galleries = useApi<GallerySummary[]>("/api/galleries/");
  const locations = useApi<Location[]>("/api/locations/");
  const err = home.error ?? posts.error ?? galleries.error ?? locations.error;
  if (err) return <p className="admin-error">{err.message}</p>;
  if (!home.data || !posts.data || !galleries.data || !locations.data) return <p className="muted">Yükleniyor…</p>;
  // Sitede yalnızca yayındaki yazılar görünür; önizleme de aynısını göstersin.
  const published = posts.data.filter((p) => p.status === "published");
  return <HomeForm initial={home.data.sections} data={{ posts: published, galleries: galleries.data, locations: locations.data }} />;
}
