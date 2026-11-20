import { SiteHeader } from "@/components/SiteHeader";

// Herkese açık sayfaların ortak çerçevesi. Yönetim paneli (/admin) bu grubun dışında,
// kendi kenar çubuğuyla çalışır.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
