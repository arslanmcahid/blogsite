"use client";

import { ChevronDown, ChevronUp, Columns3, Image as ImageIcon, Images, MapPin, Plus, Quote, Trash2, Type, Video, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { errorMessage, uploadImage } from "@/lib/admin-api";
import { BLOCK_INFO, makeBlock, type BlockType, type EBlock, type EInner } from "@/lib/editor-model";
import type { Location } from "@/lib/types";
import { youtubeId } from "@/lib/video";
import { VideoEmbed } from "../VideoEmbed";
import { DropZone } from "./DropZone";
import { ImagePicker } from "./ImagePicker";
import { RichText } from "./RichText";
import { DragHandle, SortableList } from "./Sortable";
import { useToast } from "./Toast";

export type EditorContext = {
  galleries: { slug: string; title: string }[];
  locations: Location[];
};

const ALL_TYPES: BlockType[] = ["text", "image", "quote", "video", "columns", "gallery", "map"];

const ICONS: Record<BlockType, LucideIcon> = {
  text: Type,
  image: ImageIcon,
  quote: Quote,
  columns: Columns3,
  gallery: Images,
  video: Video,
  map: MapPin,
};

function Icon({ type, size = 16, className }: { type: BlockType; size?: number; className?: string }) {
  const C = ICONS[type];
  return <C size={size} className={className} aria-hidden />;
}

function Palette({ onPick, nested }: { onPick: (t: BlockType) => void; nested: boolean }) {
  const types = nested ? ALL_TYPES.filter((t) => t !== "columns") : ALL_TYPES; // sütunun içine sütun konamaz
  return (
    <div className="palette">
      {types.map((t) => (
        <button type="button" key={t} className="palette-item" onClick={() => onPick(t)} title={BLOCK_INFO[t].hint}>
          <Icon type={t} size={15} />
          {BLOCK_INFO[t].label}
        </button>
      ))}
    </div>
  );
}

function ImageField({ block, onChange }: { block: Extract<EInner, { type: "image" }>; onChange: (b: EInner) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function drop(files: File[]) {
    setBusy(true);
    try {
      const img = await uploadImage(files[0]);
      onChange({ ...block, src: img.url, alt: block.alt || img.alt });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropZone onFiles={drop} hint="Fotoğrafı bırak">
      <div className="stack">
        {block.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={block.src} alt={block.alt ?? ""} />
        ) : (
          <div className="empty-slot">{busy ? "Yükleniyor…" : "Fotoğrafı buraya sürükleyip bırak ya da aşağıdan seç"}</div>
        )}
        <div className="row">
          <ImagePicker label={block.src ? "Fotoğrafı değiştir" : "Fotoğraf seç"} onPick={(img) => onChange({ ...block, src: img.url, alt: block.alt || img.alt })} />
        </div>
        <label>Alt yazı <span className="muted">(fotoğrafın altında görünür)</span>
          <input value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} placeholder="Örn. Göreme'de gün doğumu" />
        </label>
        <label>Fotoğrafı tarif et <span className="muted">(görme engelli okuyucular ve arama motorları için)</span>
          <input value={block.alt ?? ""} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Örn. Vadinin üstünde yükselen sıcak hava balonları" />
        </label>
      </div>
    </DropZone>
  );
}

function BlockFields({ block, onChange, ctx }: { block: EInner; onChange: (b: EInner) => void; ctx: EditorContext }) {
  switch (block.type) {
    case "text":
      return <RichText key={block.id} value={block.markdown} onChange={(markdown) => onChange({ ...block, markdown })} />;
    case "image":
      return <ImageField block={block} onChange={onChange} />;
    case "quote":
      return (
        <div className="stack">
          <label>Alıntı<textarea rows={3} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Öne çıkarmak istediğin cümle" /></label>
          <label>Kimin sözü? <span className="muted">(isteğe bağlı)</span><input value={block.author ?? ""} onChange={(e) => onChange({ ...block, author: e.target.value })} /></label>
        </div>
      );
    case "gallery":
      return ctx.galleries.length === 0 ? (
        <p className="muted small">Henüz fotoğraf sergin yok. Önce <a href="/admin/galleries/new" target="_blank">yeni bir sergi oluştur</a>, sonra buradan seç.</p>
      ) : (
        <label>Hangi sergi gösterilsin?
          <select value={block.gallery} onChange={(e) => onChange({ ...block, gallery: e.target.value })}>
            <option value="">— bir sergi seç —</option>
            {!block.gallery || ctx.galleries.some((g) => g.slug === block.gallery) ? null : <option value={block.gallery}>{block.gallery}</option>}
            {ctx.galleries.map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}
          </select>
        </label>
      );
    case "video": {
      const bad = block.url.trim() !== "" && !youtubeId(block.url);
      return (
        <div className="stack">
          <label>YouTube bağlantısı
            <input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" />
          </label>
          {bad && <p className="admin-error">Bu bir YouTube bağlantısına benzemiyor. youtube.com veya youtu.be ile başlayan adresi yapıştır.</p>}
          {!bad && block.url.trim() !== "" && <VideoEmbed url={block.url} />}
        </div>
      );
    }
    case "map":
      return ctx.locations.length === 0 ? (
        <p className="muted small">Henüz konum eklemedin. Önce <a href="/admin/locations" target="_blank">Konumlar</a> sayfasından haritaya bir yer ekle.</p>
      ) : (
        <label>Hangi yer gösterilsin?
          <select value={block.location || ""} onChange={(e) => onChange({ ...block, location: Number(e.target.value) })}>
            <option value="">— bir yer seç —</option>
            {ctx.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      );
  }
}

function ColumnsFields({ block, onChange, ctx }: { block: Extract<EBlock, { type: "columns" }>; onChange: (b: EBlock) => void; ctx: EditorContext }) {
  const count = block.columns.length;

  function setCount(n: number) {
    if (n === count) return;
    if (n > count) return onChange({ ...block, columns: [...block.columns, ...Array.from({ length: n - count }, () => [] as EInner[])] });
    // Azaltırken içerik kaybolmasın: fazla sütunların içeriği son sütuna taşınır.
    const kept = block.columns.slice(0, n).map((c) => [...c]);
    kept[n - 1].push(...block.columns.slice(n).flat());
    onChange({ ...block, columns: kept });
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="small muted">Kaç sütun?</span>
        {[2, 3, 4].map((n) => (
          <button type="button" key={n} className={`btn small ${n === count ? "primary" : ""}`} aria-pressed={n === count} onClick={() => setCount(n)}>{n}</button>
        ))}
      </div>
      <div className="cols" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {block.columns.map((col, ci) => (
          <div key={ci} className="col">
            <div className="small muted">{ci + 1}. sütun</div>
            <BlockList
              nested
              value={col}
              ctx={ctx}
              onChange={(next) => onChange({ ...block, columns: block.columns.map((c, i) => (i === ci ? (next as EInner[]) : c)) })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockList({ value, onChange, ctx, nested = false }: { value: EBlock[]; onChange: (b: EBlock[]) => void; ctx: EditorContext; nested?: boolean }) {
  const toast = useToast();
  const [openAt, setOpenAt] = useState<number | null>(null);
  const defaults = { gallery: ctx.galleries[0]?.slug, location: ctx.locations[0]?.id };

  function insertAt(index: number, type: BlockType) {
    onChange([...value.slice(0, index), makeBlock(type, defaults), ...value.slice(index)]);
    setOpenAt(null);
  }

  function remove(index: number) {
    const before = value;
    onChange(value.filter((_, i) => i !== index));
    toast.info("Bölüm silindi.", { label: "Geri al", onClick: () => onChange(before) });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  }

  const slot = (index: number) =>
    openAt === index ? (
      <div className="slot-open">
        <Palette nested={nested} onPick={(t) => insertAt(index, t)} />
        <button type="button" className="btn small" onClick={() => setOpenAt(null)}>Vazgeç</button>
      </div>
    ) : (
      <button type="button" className="slot" onClick={() => setOpenAt(index)} aria-label="Buraya bölüm ekle" title="Buraya bölüm ekle">
        <span><Plus size={14} /></span>
      </button>
    );

  return (
    <div className="blocklist">
      {value.length > 0 && slot(0)}
      <SortableList items={value} onChange={onChange} className="blocklist">
        {(block, i, handle, dragging) => (
          <>
            <section className={`block ${dragging ? "dragging" : ""}`} aria-label={BLOCK_INFO[block.type].label}>
              <div className="block-head">
                <DragHandle handle={handle} label={`${BLOCK_INFO[block.type].label} bölümünü sürükleyerek taşı`} />
                <Icon type={block.type} size={16} className="kind" />
                <strong>{BLOCK_INFO[block.type].label}</strong>
                <span className="spacer" />
                <button type="button" className="icon" aria-label="Yukarı taşı" title="Yukarı taşı" disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronUp size={16} /></button>
                <button type="button" className="icon" aria-label="Aşağı taşı" title="Aşağı taşı" disabled={i === value.length - 1} onClick={() => move(i, i + 1)}><ChevronDown size={16} /></button>
                <button type="button" className="icon danger" aria-label="Bu bölümü sil" title="Bu bölümü sil" onClick={() => remove(i)}><Trash2 size={15} /></button>
              </div>
              {block.type === "columns" ? (
                <ColumnsFields block={block} ctx={ctx} onChange={(b) => onChange(value.map((x, j) => (j === i ? b : x)))} />
              ) : (
                <BlockFields block={block} ctx={ctx} onChange={(b) => onChange(value.map((x, j) => (j === i ? b : x)))} />
              )}
            </section>
            {slot(i + 1)}
          </>
        )}
      </SortableList>
      <div className="add-more">
        <div className="small muted">{value.length === 0 ? "Başlamak için bir bölüm ekle:" : "Bölüm ekle:"}</div>
        <Palette nested={nested} onPick={(t) => insertAt(value.length, t)} />
      </div>
    </div>
  );
}

/** Yazının bölümlerini düzenleyen alan. Resimler bu alana sürüklenip bırakılabilir ya da yapıştırılabilir. */
export function BlockEditor({ value, onChange, ctx }: { value: EBlock[]; onChange: (b: EBlock[]) => void; ctx: EditorContext }) {
  const toast = useToast();

  async function addImages(files: File[]) {
    toast.info(files.length > 1 ? `${files.length} fotoğraf yükleniyor…` : "Fotoğraf yükleniyor…");
    const added: EBlock[] = [];
    for (const file of files) {
      try {
        const img = await uploadImage(file);
        const block = makeBlock("image");
        if (block.type === "image") added.push({ ...block, src: img.url, alt: img.alt });
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(added.length > 1 ? `${added.length} fotoğraf eklendi.` : "Fotoğraf eklendi.");
    }
  }

  return (
    <DropZone onFiles={addImages} hint="Fotoğrafları bırak, yazıya eklensin">
      <div
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (files.length) {
            e.preventDefault();
            addImages(files);
          }
        }}
      >
        <BlockList value={value} onChange={onChange} ctx={ctx} />
      </div>
    </DropZone>
  );
}
