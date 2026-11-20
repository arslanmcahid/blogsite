import type { Metadata } from "next";
import { Suspense } from "react";
import { GalleryGrid } from "@/components/GalleryGrid";
import { MapView } from "@/components/MapView";
import { getGallery } from "@/lib/api";
import { decodeSlug } from "@/lib/slug";

export async function generateMetadata({ params }: PageProps<"/galeri/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGallery(decodeSlug(slug));
  return { title: g.title, description: g.description || undefined };
}

async function GalleryContent({ params }: { params: PageProps<"/galeri/[slug]">["params"] }) {
  const { slug } = await params;
  const g = await getGallery(decodeSlug(slug));
  return (
    <>
      <h1>{g.title}</h1>
      {g.description && <p className="lead">{g.description}</p>}
      <GalleryGrid items={g.items} />
      {g.location_detail && (
        <section>
          <h2>📍 {g.location_detail.name}</h2>
          <MapView locations={[g.location_detail]} height={260} />
        </section>
      )}
    </>
  );
}

export default function GalleryPage({ params }: PageProps<"/galeri/[slug]">) {
  return (
    <main className="container">
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}><GalleryContent params={params} /></Suspense>
    </main>
  );
}
