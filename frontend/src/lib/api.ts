import { notFound } from "next/navigation";
import type {
  AdPlacement,
  Category,
  Gallery,
  GallerySummary,
  HomeLayout,
  Location,
  Post,
  PostSummary,
  PublicAd,
  Tag,
} from "./types";

// Sunucu tarafı (SSR) Django API adresi. Docker içinde "http://backend:8000" olur.
export const API_URL = process.env.API_URL ?? "http://localhost:8000";

/** 404'te null döner (blok içi gömülü içerikler sayfayı 404'e düşürmesin diye). */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API hatası ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

/** 404'te sayfayı Next'in not-found sayfasına düşürür. */
export async function apiGet<T>(path: string): Promise<T> {
  const data = await apiGetOrNull<T>(path);
  if (data === null) notFound();
  return data;
}

export const getHome = () => apiGet<HomeLayout>("/api/home/");
export const getPosts = (
  filter: { location?: number; category?: string; tag?: string } = {},
) => {
  const q = new URLSearchParams();
  if (filter.location) q.set("location", String(filter.location));
  if (filter.category) q.set("category", filter.category);
  if (filter.tag) q.set("tag", filter.tag);
  return apiGet<PostSummary[]>(`/api/posts/${q.size ? `?${q}` : ""}`);
};
export const getCategories = () => apiGet<Category[]>("/api/categories/");
export const getTags = () => apiGet<Tag[]>("/api/tags/");
export const getPost = (slug: string) =>
  apiGet<Post>(`/api/posts/${encodeURIComponent(slug)}/`);
export const getGalleries = () => apiGet<GallerySummary[]>("/api/galleries/");
export const getGallery = (slug: string) =>
  apiGet<Gallery>(`/api/galleries/${encodeURIComponent(slug)}/`);
export const getLocations = () => apiGet<Location[]>("/api/locations/");
export const getGalleryOrNull = (slug: string) =>
  apiGetOrNull<Gallery>(`/api/galleries/${encodeURIComponent(slug)}/`);

/** Bir yer için o an yayında olan (ağırlığa göre seçilmiş) reklam; yoksa null. Hata sayfayı bozmaz. */
export async function pickAd(
  placement: AdPlacement,
  opts: { pin?: number; exclude?: number[] } = {},
): Promise<PublicAd | null> {
  const q = new URLSearchParams({ placement });
  if (opts.pin) q.set("pin", String(opts.pin));
  if (opts.exclude?.length) q.set("exclude", opts.exclude.join(","));
  try {
    return (
      (await apiGetOrNull<{ ad: PublicAd | null }>(`/api/sponsor/pick/?${q}`))
        ?.ad ?? null
    );
  } catch {
    return null;
  }
}
