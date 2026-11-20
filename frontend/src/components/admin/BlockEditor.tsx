"use client";

import type { Block, InnerBlock, Location } from "@/lib/types";
import { ImagePicker } from "./ImagePicker";

export type EditorContext = {
  galleries: { slug: string; title: string }[];
  locations: Location[];
};

const LABELS: Record<Block["type"], string> = {
  text: "Metin",
  image: "Resim",
  quote: "Alıntı",
  gallery: "Galeri",
  map: "Harita",
  columns: "Gazete kolonları",
};

function newBlock(type: Block["type"], ctx: EditorContext): Block {
  switch (type) {
    case "text": return { type, markdown: "" };
    case "image": return { type, src: "", alt: "", caption: "" };
    case "quote": return { type, text: "", author: "" };
    case "gallery": return { type, gallery: ctx.galleries[0]?.slug ?? "" };
    case "map": return { type, location: ctx.locations[0]?.id ?? 0 };
    case "columns": return { type, columns: [[], []] };
  }
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

function BlockFields({ block, onChange, ctx }: { block: InnerBlock; onChange: (b: InnerBlock) => void; ctx: EditorContext }) {
  switch (block.type) {
    case "text":
      return (
        <label>
          Markdown
          <textarea rows={7} value={block.markdown} onChange={(e) => onChange({ ...block, markdown: e.target.value })}
            placeholder={"## Başlık\n\nParagraf, **kalın**, *italik*, [bağlantı](https://…)\n\n- liste"} />
        </label>
      );
    case "image":
      return (
        <div className="stack">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumb" src={block.src} alt={block.alt ?? ""} />
          ) : <p className="muted small">Henüz görsel seçilmedi.</p>}
          <ImagePicker label={block.src ? "Görseli değiştir" : "Görsel seç"} onPick={(img) => onChange({ ...block, src: img.url, alt: block.alt || img.alt })} />
          <label>Alternatif metin (erişilebilirlik)<input value={block.alt ?? ""} onChange={(e) => onChange({ ...block, alt: e.target.value })} /></label>
          <label>Alt yazı<input value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} /></label>
        </div>
      );
    case "quote":
      return (
        <div className="stack">
          <label>Alıntı<textarea rows={3} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} /></label>
          <label>Kaynak (isteğe bağlı)<input value={block.author ?? ""} onChange={(e) => onChange({ ...block, author: e.target.value })} /></label>
        </div>
      );
    case "gallery":
      return ctx.galleries.length === 0 ? (
        <p className="muted small">Önce Galeriler bölümünden bir galeri oluştur.</p>
      ) : (
        <label>
          Galeri
          <select value={block.gallery} onChange={(e) => onChange({ ...block, gallery: e.target.value })}>
            {!ctx.galleries.some((g) => g.slug === block.gallery) && <option value={block.gallery}>{block.gallery || "— seç —"}</option>}
            {ctx.galleries.map((g) => <option key={g.slug} value={g.slug}>{g.title}</option>)}
          </select>
        </label>
      );
    case "map":
      return ctx.locations.length === 0 ? (
        <p className="muted small">Önce Konumlar bölümünden bir konum ekle.</p>
      ) : (
        <label>
          Konum
          <select value={block.location} onChange={(e) => onChange({ ...block, location: Number(e.target.value) })}>
            {!ctx.locations.some((l) => l.id === block.location) && <option value={block.location}>— seç —</option>}
            {ctx.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      );
  }
}

function ColumnsFields({ block, onChange, ctx }: { block: Extract<Block, { type: "columns" }>; onChange: (b: Block) => void; ctx: EditorContext }) {
  const count = block.columns.length;

  function setCount(n: number) {
    if (n === count) return;
    if (n > count) return onChange({ ...block, columns: [...block.columns, ...Array.from({ length: n - count }, () => [] as InnerBlock[])] });
    // Azaltırken içerik kaybolmasın: fazla kolonların blokları son kolona taşınır.
    const kept = block.columns.slice(0, n).map((c) => [...c]);
    kept[n - 1].push(...block.columns.slice(n).flat());
    onChange({ ...block, columns: kept });
  }

  return (
    <div className="stack">
      <div className="row">
        <span className="small muted">Kolon sayısı:</span>
        {[2, 3, 4].map((n) => (
          <button type="button" key={n} className={`btn small ${n === count ? "primary" : ""}`} onClick={() => setCount(n)}>{n}</button>
        ))}
      </div>
      <div className="cols" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {block.columns.map((col, ci) => (
          <div key={ci} className="col">
            <div className="small muted">Kolon {ci + 1}</div>
            <BlockList
              nested
              value={col}
              ctx={ctx}
              onChange={(next) => onChange({ ...block, columns: block.columns.map((c, i) => (i === ci ? (next as InnerBlock[]) : c)) })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const ADDABLE: Block["type"][] = ["text", "image", "quote", "gallery", "map", "columns"];

function BlockList({ value, onChange, ctx, nested = false }: { value: Block[]; onChange: (b: Block[]) => void; ctx: EditorContext; nested?: boolean }) {
  const types = nested ? ADDABLE.filter((t) => t !== "columns") : ADDABLE; // kolon içine kolon konamaz

  return (
    <div className="blocklist">
      {value.map((block, i) => (
        <div className="block" key={i}>
          <div className="block-head">
            <strong>{LABELS[block.type]}</strong>
            <span className="spacer" />
            <button type="button" className="icon" title="Yukarı taşı" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))}>↑</button>
            <button type="button" className="icon" title="Aşağı taşı" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))}>↓</button>
            <button type="button" className="icon danger" title="Sil" onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
          </div>
          {block.type === "columns" ? (
            <ColumnsFields block={block} ctx={ctx} onChange={(b) => onChange(value.map((x, j) => (j === i ? b : x)))} />
          ) : (
            <BlockFields block={block} ctx={ctx} onChange={(b) => onChange(value.map((x, j) => (j === i ? b : x)))} />
          )}
        </div>
      ))}
      <div className="add-row">
        <span className="small muted">Ekle:</span>
        {types.map((t) => (
          <button type="button" key={t} className="btn small" onClick={() => onChange([...value, newBlock(t, ctx)])}>+ {LABELS[t]}</button>
        ))}
      </div>
    </div>
  );
}

export function BlockEditor(props: { value: Block[]; onChange: (b: Block[]) => void; ctx: EditorContext }) {
  return <BlockList {...props} />;
}
