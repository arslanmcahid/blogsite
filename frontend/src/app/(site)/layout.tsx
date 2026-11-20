import { SiteHeader } from "@/components/SiteHeader";

// İçerik admin panelinden sürekli değişir; sayfalar build anında dondurulmasın,
// her istekte backend'den taze okunsun (aynı zamanda bilinmeyen adreslere gerçek 404 döner).
export const dynamic = "force-dynamic";

// Herkese açık sayfaların ortak çerçevesi. Yönetim paneli (/admin) bu grubun dışında,
// kendi kenar çubuğuyla çalışır.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Klavye ve ekran okuyucu kullanıcıları için menüyü atlayıp içeriğe geçiş */}
      <a href="#main" className="skip-link">İçeriğe geç</a>
      <SiteHeader />
      {children}
      <footer className="site-footer">
        <a href="/feed.xml">RSS</a>
      </footer>
    </>
  );
}
