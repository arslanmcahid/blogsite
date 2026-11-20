// Yazı editörünün istemci tarafı veri modeli.
//
// Backend'deki blok listesi ({type: "text", ...}) sıralanabilsin diye editörde her bloğa
// geçici bir `id` verilir. Kaydederken bu kimlikler silinir ve boş bloklar atlanır,
// yani veritabanına giden veri eskisiyle birebir aynı şemadadır.

import type { Block, InnerBlock, PostTheme } from "./types";

export type EInner = InnerBlock & { id: string };
export type EColumns = { id: string; type: "columns"; columns: EInner[][] };
export type EBlock = EInner | EColumns;

export const newId = () => Math.random().toString(36).slice(2, 10);

const withId = (b: InnerBlock): EInner => ({ ...b, id: newId() });

export function toEditor(blocks: Block[]): EBlock[] {
  return blocks.map((b) =>
    b.type === "columns" ? { id: newId(), type: "columns", columns: b.columns.map((c) => c.map(withId)) } : withId(b),
  );
}

function isEmptyInner(b: InnerBlock): boolean {
  switch (b.type) {
    case "text": return b.markdown.trim() === "";
    case "image": return !b.src;
    case "quote": return b.text.trim() === "";
    case "gallery": return !b.gallery;
    case "map": return !b.location;
  }
}

function stripInner(b: EInner): InnerBlock {
  const copy: Partial<EInner> = { ...b };
  delete copy.id;
  return copy as InnerBlock;
}

/** Kayda hazırlar: kimlikleri siler, boş blokları atlar. */
export function toApi(blocks: EBlock[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.type === "columns") {
      const columns = b.columns.map((c) => c.map(stripInner).filter((x) => !isEmptyInner(x)));
      if (columns.every((c) => c.length === 0)) continue;
      out.push({ type: "columns", columns });
    } else {
      const plain = stripInner(b);
      if (!isEmptyInner(plain)) out.push(plain);
    }
  }
  return out;
}

export type BlockType = EBlock["type"];

export const BLOCK_INFO: Record<BlockType, { label: string; emoji: string; hint: string }> = {
  text: { label: "Yazı", emoji: "✍️", hint: "Paragraflar, başlıklar, listeler" },
  image: { label: "Fotoğraf", emoji: "🖼️", hint: "Tek bir fotoğraf ve alt yazısı" },
  quote: { label: "Alıntı", emoji: "❝", hint: "Öne çıkan bir söz" },
  columns: { label: "Gazete sütunları", emoji: "📰", hint: "Yan yana 2-4 sütun" },
  gallery: { label: "Fotoğraf sergisi", emoji: "🎞️", hint: "Hazırladığın bir sergiyi göm" },
  map: { label: "Harita", emoji: "📍", hint: "Bir konumu haritada göster" },
};

export function makeBlock(type: BlockType, defaults: { gallery?: string; location?: number } = {}): EBlock {
  const id = newId();
  switch (type) {
    case "text": return { id, type, markdown: "" };
    case "image": return { id, type, src: "", alt: "", caption: "" };
    case "quote": return { id, type, text: "", author: "" };
    case "gallery": return { id, type, gallery: defaults.gallery ?? "" };
    case "map": return { id, type, location: defaults.location ?? 0 };
    case "columns": return { id, type, columns: [[], []] };
  }
}

// --- Hazır başlangıç şablonları ---

export type Template = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  theme: PostTheme;
  blocks: Block[];
};

export const TEMPLATES: Template[] = [
  {
    id: "article",
    title: "Düz yazı",
    emoji: "✍️",
    description: "Giriş, gelişme ve sonuç bölümleriyle klasik bir yazı.",
    theme: { font: "serif", width: "normal" },
    blocks: [
      { type: "text", markdown: "" },
      { type: "text", markdown: "## Gelişme\n\n" },
      { type: "text", markdown: "## Sonuç\n\n" },
    ],
  },
  {
    id: "photo-trip",
    title: "Fotoğraflı gezi yazısı",
    emoji: "🗺️",
    description: "Anlatım, fotoğraflar ve gittiğin yerin haritası.",
    theme: { font: "serif", width: "normal" },
    blocks: [
      { type: "text", markdown: "" },
      { type: "image", src: "", alt: "", caption: "" },
      { type: "text", markdown: "" },
      { type: "image", src: "", alt: "", caption: "" },
      { type: "map", location: 0 },
    ],
  },
  {
    id: "newspaper",
    title: "Gazete sayfası",
    emoji: "📰",
    description: "Geniş sayfada yan yana sütunlar, alıntı ve fotoğraf.",
    theme: { font: "serif", width: "wide" },
    blocks: [
      { type: "text", markdown: "" },
      {
        type: "columns",
        columns: [
          [{ type: "text", markdown: "" }],
          [{ type: "quote", text: "", author: "" }, { type: "image", src: "", alt: "", caption: "" }],
        ],
      },
      { type: "text", markdown: "" },
    ],
  },
  {
    id: "exhibition",
    title: "Fotoğraf sergisi",
    emoji: "🎞️",
    description: "Kısa bir tanıtım ve geniş bir fotoğraf sergisi.",
    theme: { font: "sans", width: "wide" },
    blocks: [
      { type: "text", markdown: "" },
      { type: "gallery", gallery: "" },
    ],
  },
  {
    id: "blank",
    title: "Boş sayfa",
    emoji: "📄",
    description: "Sıfırdan, kendin kur.",
    theme: { font: "serif", width: "normal" },
    blocks: [{ type: "text", markdown: "" }],
  },
];
