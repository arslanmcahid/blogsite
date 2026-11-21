import { Suspense } from "react";
import { AdEditor } from "@/components/admin/AdEditor";

async function Editor({ params }: { params: PageProps<"/admin/ads/[id]">["params"] }) {
  const { id } = await params;
  return <AdEditor id={id} />;
}

export default function EditAdPage({ params }: PageProps<"/admin/ads/[id]">) {
  return <Suspense fallback={<p className="muted">Yükleniyor…</p>}><Editor params={params} /></Suspense>;
}
