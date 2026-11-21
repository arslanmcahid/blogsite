"use client";

import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Images, MapPin, Megaphone, MessageSquare, Newspaper, Pencil, Plus, RotateCcw, Star, Trash2, X, type LucideIcon } from "lucide-react";
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
  ad: { label: "Reklam alanı", short: "Reklam", icon: Megaphone, hint: "Yayındaki bir reklam gösterilir (Reklamlar sayfasından yönetilir)." },
};
const HAS_LIMIT: Kind[] = ["latest_posts", "gallery_showcase"];

type Item = HomeSection & { id: string };
type Data = { posts: PostSummary[]; galleries: GallerySummary[]; locations: Location[] };

/* ---------- Canlı önizleme: bölümler sitedeki gibi görünür, her kart tek tek yönetilir ---------- */

type Entry = { id: string; title: string; cover_url: string | null; sub?: string };

const ITEM_KINDS: Kind[] = ["featured_post", "latest_posts", "gallery_showcase"];
const isGallery = (t: Kind) => t === "gallery_showcase";

function poolOf(type: Kind, data: Data): Entry[] {
  if (isGallery(type)) return data.galleries.filter((g) => g.is_published).map((g) => ({ id: g.slug, title: g.title, cover_url: g.cover_url }));
  return data.posts.map((p) => ({ id: p.slug, title: p.title, cover_url: p.cover_url, sub: p.published_at ? formatDate(p.published_at) : undefined }));
}

/** Bölümde şu an görünen kartlar: elle seçilenler, yoksa sitenin otomatik seçtikleri. */
function shownOf(s: Item, data: Data, featuredSlug?: string): Entry[] {
  const pool = poolOf(s.type, data);
  if (s.items) return s.items.flatMap((slug) => pool.filter((e) => e.id === slug));
  if (s.type === "featured_post") return pool.slice(0, 1);
  if (s.type === "latest_posts") return pool.filter((e) => e.id !== featuredSlug).slice(0, s.limit ?? 6);
  return pool.slice(0, s.limit ?? 4);
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hp-empty">{children}</p>;
}

function Tile({ e, featured, tools }: { e: Entry; featured?: boolean; tools: React.ReactNode }) {
  return (
    <article className={featured ? "hp-card hp-card-featured" : "hp-card"}>
      <div className="hp-item-tools">{tools}</div>
      {e.cover_url && (
        <div className="hp-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.cover_url} alt="" />
        </div>
      )}
      <div className="hp-card-body">
        {e.sub && <time>{e.sub}</time>}
        <h3>{e.title}</h3>
      </div>
    </article>
  );
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
        {HAS_LIMIT.includes(item.type) && !item.items && (
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

/* ---------- Kart seçme penceresi ---------- */

function PickDialog({ title, pool, taken, onPick, onClose }: { title: string; pool: Entry[]; taken: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const choices = pool.filter((e) => !taken.includes(e.id));
  return (
    <dialog ref={ref} className="hp-dialog" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <div className="stack">
        <div className="hp-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon" aria-label="Kapat" onClick={() => ref.current?.close()}><X size={16} /></button>
        </div>
        {choices.length === 0 ? (
          <p className="muted">Eklenebilecek başka yayında içerik yok.</p>
        ) : (
          <ul className="hp-pick">
            {choices.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => { onPick(e.id); ref.current?.close(); }}>
                  {e.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_url} alt="" />
                  ) : (
                    <span className="hp-pick-ph" />
                  )}
                  <span><strong>{e.title}</strong>{e.sub && <small>{e.sub}</small>}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

/* ---------- Ana editör ---------- */

type Picking = { sectionId: string; replace?: string } | null;

function HomeForm({ initial, data, onSaved }: { initial: HomeSection[]; data: Data; onSaved: () => void }) {
  const toast = useToast();
  const [sections, setSections] = useState<Item[]>(() => initial.map((s) => ({ ...s, id: newId() })));
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [busy, setBusy] = useState(false);
  const lastAdded = useRef<string | null>(null);

  const clean = (list: Item[]): HomeSection[] =>
    list.map((s) => {
      const out: HomeSection = { type: s.type };
      if (s.title?.trim()) out.title = s.title.trim();
      if (HAS_LIMIT.includes(s.type) && s.limit) out.limit = s.limit;
      if (ITEM_KINDS.includes(s.type) && s.items) out.items = s.items;
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

  useEffect(() => {
    if (!lastAdded.current) return;
    document.getElementById(`hp-${lastAdded.current}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    lastAdded.current = null;
  }, [sections.length]);

  const featuredSlug = sections.some((s) => s.type === "featured_post") ? shownOf(sections.find((s) => s.type === "featured_post")!, data)[0]?.id : undefined;
  const shown = (s: Item) => shownOf(s, data, featuredSlug);

  const patch = (id: string, p: Partial<HomeSection>) => setSections((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const setItems = (id: string, items: string[] | undefined) => patch(id, { items });
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

  function removeEntry(s: Item, id: string) {
    const before = shown(s).map((e) => e.id);
    setItems(s.id, before.filter((x) => x !== id));
    toast.info("Kart bölümden çıkarıldı.", { label: "Geri al", onClick: () => setItems(s.id, before) });
  }

  function pick(id: string) {
    if (!picking) return;
    const s = sections.find((x) => x.id === picking.sectionId);
    if (!s) return;
    const cur = shown(s).map((e) => e.id);
    setItems(s.id, picking.replace ? cur.map((x) => (x === picking.replace ? id : x)) : [...cur, id]);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await adminFetch<HomeLayout>("/api/home/", { method: "PUT", json: { sections: clean(sections) } });
      setSaved(snapshot);
      toast.success("Ana sayfa kaydedildi.", { label: "Sitede gör", onClick: () => window.open("/", "_blank") });
      // Sayfa kaydedilen veriyle baştan yüklenir.
      window.scrollTo({ top: 0 });
      onSaved();
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

  const editingItem = sections.find((s) => s.id === editing);
  const pickingSection = sections.find((s) => s.id === picking?.sectionId);

  const sectionTools = (i: number, s: Item, handle: HandleProps) => {
    const { ref, ...rest } = handle;
    return (
      <div className="hp-tools">
        <button type="button" className="hp-pillbtn" onClick={() => setEditing(s.id)}><Pencil size={14} aria-hidden /> Düzenle</button>
        {ITEM_KINDS.includes(s.type) && s.items && (
          <button type="button" className="hp-round" aria-label="Otomatiğe döndür" title="Kartları sitenin otomatik seçmesine bırak (en yeniler)" onClick={() => setItems(s.id, undefined)}><RotateCcw size={15} /></button>
        )}
        <button type="button" className="hp-round" aria-label="Yukarı taşı" title="Yukarı taşı" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></button>
        <button type="button" className="hp-round" aria-label="Aşağı taşı" title="Aşağı taşı" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></button>
        <button type="button" ref={ref} className="hp-round hp-grab" aria-label="Sürükleyerek taşı" title="Tutup sürükle" {...rest}><GripVertical size={16} /></button>
        <button type="button" className="hp-round hp-del" aria-label={`${INFO[s.type].label} bölümünü kaldır`} title="Ana sayfadan kaldır" onClick={() => remove(i)}><Trash2 size={15} /></button>
      </div>
    );
  };

  const entryTools = (s: Item, e: Entry, handle: HandleProps) => {
    const { ref, ...rest } = handle;
    return (
      <>
        {s.type !== "featured_post" && <button type="button" ref={ref} className="hp-round hp-grab" aria-label="Kartı sürükleyerek taşı" title="Tutup sürükle" {...rest}><GripVertical size={15} /></button>}
        <button type="button" className="hp-round" aria-label={`${e.title} kartını değiştir`} title="Başka bir içerikle değiştir" onClick={() => setPicking({ sectionId: s.id, replace: e.id })}><Pencil size={14} /></button>
        <button type="button" className="hp-round hp-del" aria-label={`${e.title} kartını çıkar`} title="Bu kartı çıkar" onClick={() => removeEntry(s, e.id)}><Trash2 size={14} /></button>
      </>
    );
  };

  function body(s: Item) {
    if (s.type === "map")
      return data.locations.length ? <MapView locations={data.locations} height={260} /> : <Empty>Konum ekleyince harita burada görünecek.</Empty>;
    if (s.type === "ad")
      return <Empty>Burada reklam gösterilir. Hangi reklamın çıkacağı <a href="/admin/ads" target="_blank" style={{ textDecoration: "underline" }}>Reklamlar</a> sayfasındaki ayarlara göre belirlenir.</Empty>;
    if (s.type === "text")
      return s.markdown?.trim() ? <Markdown>{s.markdown}</Markdown> : <Empty>Bu kutu boş. “Düzenle”ye basıp mesajını yaz.</Empty>;
    const list = shown(s);
    const canAdd = s.type !== "featured_post" || list.length === 0;
    return (
      <>
        {s.type === "featured_post" ? (
          list.map((e) => (
            <SortableList key={e.id} items={[e]} onChange={() => {}} className="hp-one">
              {(_, __, handle) => <Tile e={e} featured tools={entryTools(s, e, handle)} />}
            </SortableList>
          ))
        ) : (
          <SortableList items={list} layout="grid" className="hp-grid" onChange={(next) => setItems(s.id, next.map((e) => e.id))}>
            {(e, _i, handle) => <Tile e={e} tools={entryTools(s, e, handle)} />}
          </SortableList>
        )}
        {list.length === 0 && <Empty>Bu bölümde gösterilecek içerik yok.</Empty>}
        {canAdd && (
          <button type="button" className="hp-addcard" onClick={() => setPicking({ sectionId: s.id })}>
            <Plus size={16} aria-hidden /> {isGallery(s.type) ? "Sergi ekle" : "Yazı ekle"}
          </button>
        )}
      </>
    );
  }

  const defaultTitle: Record<Kind, string> = { featured_post: "", latest_posts: "Son yazılar", gallery_showcase: "Sergiler", map: "Gittiğim yerler", text: "", ad: "" };

  return (
    <div className="hp">
      <div className="hp-head">
        <div>
          <h2 className="hp-h">Ana sayfa</h2>
          <p className="muted">Ziyaretçilerin göreceği ana sayfa aşağıda. Kartları ve bölümleri düzenleyip <strong>Kaydet</strong>’e bas.</p>
        </div>
        <span className="spacer" />
        <span className="state">{dirty ? "Kaydedilmemiş değişiklikler var" : ""}</span>
        <a className="btn" href="/" target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden /> Sitede gör</a>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>

      <div className="hp-add" data-tour="home-add" role="group" aria-label="Bölüm ekle">
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

      <SortableList items={sections} onChange={setSections} className="hp-list">
        {(s, i, handle, dragging) => {
          const auto = ITEM_KINDS.includes(s.type) && !s.items;
          const heading = s.title || defaultTitle[s.type];
          return (
            <section id={`hp-${s.id}`} data-tour="home-frame" className={`hp-frame ${dragging ? "dragging" : ""}`}>
              <div className="hp-frame-head">
                <div className="hp-titlewrap">
                  {heading ? <h3 className="hp-title">{heading}</h3> : <span className="hp-title muted">{INFO[s.type].label}</span>}
                  <span className="hp-tag">{INFO[s.type].label}{auto ? " · otomatik" : ""}</span>
                </div>
                {sectionTools(i, s, handle)}
              </div>
              <div className="hp-body">{body(s)}</div>
            </section>
          );
        }}
      </SortableList>
      {sections.length === 0 && (
        <div className="empty-state"><p>Ana sayfan şu an boş. Yukarıdaki düğmelerden bir bölüm ekleyerek başla.</p></div>
      )}

      {editingItem && <EditDialog item={editingItem} onChange={(p) => patch(editingItem.id, p)} onClose={() => setEditing(null)} />}
      {picking && pickingSection && (
        <PickDialog
          title={picking.replace ? "Bu kartın yerine ne gelsin?" : isGallery(pickingSection.type) ? "Hangi sergiyi ekleyelim?" : "Hangi yazıyı ekleyelim?"}
          pool={poolOf(pickingSection.type, data)}
          taken={shown(pickingSection).map((e) => e.id)}
          onPick={pick}
          onClose={() => setPicking(null)}
        />
      )}
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
  const published = posts.data.filter((p) => p.status === "published");
  return <HomeForm key={JSON.stringify(home.data.sections)} onSaved={home.reload} initial={home.data.sections} data={{ posts: published, galleries: galleries.data, locations: locations.data }} />;
}
