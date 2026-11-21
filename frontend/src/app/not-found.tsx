import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false } };

// Hiçbir sayfayla eşleşmeyen adresler (örn. /abc) için; bu durumda (site) düzeni devreye girmez.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundView />
    </>
  );
}
