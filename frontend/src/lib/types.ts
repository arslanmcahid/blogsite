// Backend'deki blok şemasının (backend/blog/validators.py) TypeScript karşılığı.
// İki taraf birlikte değişmeli.

export type InnerBlock =
  | { type: "text"; markdown: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "quote"; text: string; author?: string }
  | { type: "gallery"; gallery: string }
  | { type: "video"; url: string }
  | { type: "ad"; ad?: number }
  | { type: "map"; location: number };

export type Block =
  | InnerBlock
  | { type: "columns"; columns: InnerBlock[][] };

export type Location = {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
};

export type Category = { id: number; name: string; slug: string };
export type Tag = { id: number; name: string; slug: string };
export type Source = { text: string; url?: string };
export type InfoRow = { label: string; value: string };
export type RelatedPost = { id: number; slug: string; title: string; cover_url: string | null };

export type PostSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover: number | null;
  cover_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
  location_details: Location[];
  category: number | null;
  category_detail: Category | null;
  tags: number[];
  tag_details: Tag[];
};

export type PostTheme = {
  // Yazıya özel tasarım ayarları (admin'de düzenlenecek).
  font?: "serif" | "sans";
  width?: "narrow" | "normal" | "wide";
  accent?: string;
};

export type Post = PostSummary & {
  blocks: Block[];
  theme: PostTheme;
  sources: Source[];
  info: InfoRow[];
  related: number[];
  related_details: RelatedPost[];
};

export type GalleryItem = {
  id: number;
  image: number;
  url: string;
  width: number | null;
  height: number | null;
  caption: string;
};

export type GallerySummary = {
  id: number;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  location: number | null;
  location_detail: Location | null;
  is_published: boolean;
};

export type Gallery = GallerySummary & { items: GalleryItem[] };

export type HomeSection = {
  type: "featured_post" | "latest_posts" | "gallery_showcase" | "map" | "text" | "ad";
  title?: string;
  limit?: number;
  markdown?: string;
  /** Elle seçilmiş yazı/sergi slug'ları; yoksa en yeniler otomatik gösterilir. */
  items?: string[];
};

export type HomeLayout = { sections: HomeSection[] };

// --- Admin tarafı ---
export type AdminImage = {
  id: number;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

// --- Reklamlar ---
export type AdPlacement = "home" | "post_inline" | "post_end" | "side_left" | "side_right";
export type AdFormat = "auto" | "leaderboard" | "billboard" | "rect" | "tall";

/** Afiş biçimleri: görsel bu orana kırpılır (auto: görselin kendi oranı). */
export const AD_FORMATS: { id: AdFormat; label: string; ratio: string | null; hint: string }[] = [
  { id: "auto", label: "Görselin kendi oranı", ratio: null, hint: "Kırpılmaz" },
  { id: "leaderboard", label: "Yatay şerit 728×90", ratio: "728 / 90", hint: "Yazı içi ve sonu için" },
  { id: "billboard", label: "Geniş yatay 970×250", ratio: "970 / 250", hint: "Ana sayfa için" },
  { id: "rect", label: "Dikdörtgen 300×250", ratio: "300 / 250", hint: "Her yerde" },
  { id: "tall", label: "Dikey 160×600", ratio: "160 / 600", hint: "Yan alanlar için" },
];
export const AD_PLACEMENTS: { id: AdPlacement; label: string; hint: string }[] = [
  { id: "home", label: "Ana sayfa", hint: "Ana sayfanın içinde (düzenden “Reklam” bölümü eklemezsen ilk bölümün altında)" },
  { id: "post_inline", label: "Yazı içi", hint: "Yazının içinde (yazıya “Reklam” bölümü eklemezsen ortasına otomatik)" },
  { id: "post_end", label: "Yazı sonu", hint: "Her yazının altında, otomatik" },
  { id: "side_left", label: "Yan alan (sol)", hint: "Geniş ekranlarda sayfanın sol boşluğunda, tüm sayfalarda" },
  { id: "side_right", label: "Yan alan (sağ)", hint: "Geniş ekranlarda sayfanın sağ boşluğunda, tüm sayfalarda" },
];

export type PublicAd = {
  id: number;
  kind: "banner" | "text";
  name: string;
  title: string;
  body: string;
  cta: string;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  format: AdFormat;
  focus_x: number;
  focus_y: number;
};

export type Ad = {
  id: number;
  name: string;
  kind: "banner" | "text";
  image: number | null;
  image_url: string | null;
  title: string;
  body: string;
  cta: string;
  link_url: string;
  placements: AdPlacement[];
  weight: number;
  format: AdFormat;
  focus_x: number;
  focus_y: number;
  is_active: boolean;
  starts_on: string | null;
  ends_on: string | null;
  status: "running" | "scheduled" | "ended" | "paused";
  views: number | null;
  clicks: number | null;
  created_at: string;
};

export type AdStats = {
  group: "day" | "week" | "month";
  rows: { period: string; views: number; clicks: number }[];
  by_placement: { placement: AdPlacement; views: number; clicks: number }[];
  totals: { views: number; clicks: number };
};
