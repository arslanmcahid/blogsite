// Backend'deki blok şemasının (backend/blog/validators.py) TypeScript karşılığı.
// İki taraf birlikte değişmeli.

export type InnerBlock =
  | { type: "text"; markdown: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "quote"; text: string; author?: string }
  | { type: "gallery"; gallery: string }
  | { type: "video"; url: string }
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
  type: "featured_post" | "latest_posts" | "gallery_showcase" | "map" | "text";
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
