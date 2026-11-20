import { Suspense } from "react";
import { PostEditor } from "@/components/admin/PostEditor";
import { decodeSlug } from "@/lib/slug";

async function Editor({ params }: { params: PageProps<"/admin/posts/[slug]">["params"] }) {
  const { slug } = await params;
  return <PostEditor slug={decodeSlug(slug)} />;
}

export default function EditPostPage({ params }: PageProps<"/admin/posts/[slug]">) {
  return <Suspense fallback={<p className="muted">Yükleniyor…</p>}><Editor params={params} /></Suspense>;
}
