import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false } };

// (site) grubunun içinden notFound() çağrılınca gösterilir; menü ve alt bilgi grubun layout'undan gelir.
export default function SiteNotFound() {
  return <NotFoundView />;
}
