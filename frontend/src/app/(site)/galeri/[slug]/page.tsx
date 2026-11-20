import type { Metadata } from "next";
import { GalleryGrid } from "@/components/GalleryGrid";
import { MapView } from "@/components/MapView";
import { getGallery } from "@/lib/api";
import { decodeSlug } from "@/lib/slug";

export async function generateMetadata({ params }: PageProps<"/galeri/[slug]">): Promise<Metadata> {
  const g = await getGallery(decodeSlug((await params).slug));
  const path = `/galeri/${encodeURIComponent(g.slug)}`;
  return {
    title: g.title,
    description: g.description || undefined,
    alternates: { canonical: path },
    openGraph: { title: g.title, description: g.description || undefined, url: path, images: g.cover_url ? [g.cover_url] : undefined },
  };
}

export default async function GalleryPage({ params }: PageProps<"/galeri/[slug]">) {
  const g = await getGallery(decodeSlug((await params).slug));
  return (
    <main id="main" className="container">
      <h1>{g.title}</h1>
      {g.description && <p className="lead">{g.description}</p>}
      <GalleryGrid items={g.items} />
      {g.location_detail && (
        <section>
          <h2>📍 {g.location_detail.name}</h2>
          <MapView locations={[g.location_detail]} height={260} />
        </section>
      )}
    </main>
  );
}
