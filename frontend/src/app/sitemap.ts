import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getGalleries, getPosts } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // Backend'e istek atar; build sırasında değil, istek anında çalışmalı.
  const [posts, galleries] = await Promise.all([getPosts(), getGalleries()]);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/yazilar`, changeFrequency: "daily" },
    { url: `${SITE_URL}/galeri` },
    { url: `${SITE_URL}/harita` },
    ...posts.map((p) => ({
      url: `${SITE_URL}/yazilar/${encodeURIComponent(p.slug)}`,
      lastModified: p.published_at ?? undefined,
    })),
    ...galleries.map((g) => ({ url: `${SITE_URL}/galeri/${encodeURIComponent(g.slug)}` })),
  ];
}
