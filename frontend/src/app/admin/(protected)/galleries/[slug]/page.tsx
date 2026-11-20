import { Suspense } from "react";
import { GalleryEditor } from "@/components/admin/GalleryEditor";
import { decodeSlug } from "@/lib/slug";

async function Editor({ params }: { params: PageProps<"/admin/galleries/[slug]">["params"] }) {
  const { slug } = await params;
  return <GalleryEditor slug={decodeSlug(slug)} />;
}

export default function EditGalleryPage({ params }: PageProps<"/admin/galleries/[slug]">) {
  return <Suspense fallback={<p className="muted">Yükleniyor…</p>}><Editor params={params} /></Suspense>;
}
