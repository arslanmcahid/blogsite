import { AdView } from "@/components/AdView";
import { SiteHeader } from "@/components/SiteHeader";
import { pickAd } from "@/lib/api";

// İçerik admin panelinden sürekli değişir; sayfalar build anında dondurulmasın,
// her istekte backend'den taze okunsun (aynı zamanda bilinmeyen adreslere gerçek 404 döner).
export const dynamic = "force-dynamic";

// Herkese açık sayfaların ortak çerçevesi. Yönetim paneli (/admin) bu grubun dışında,
// kendi kenar çubuğuyla çalışır. Geniş ekranlarda içeriğin iki yanındaki boşluk reklam alanıdır.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const left = await pickAd("side_left");
  // Sağ ve sol aynı reklamı göstermesin.
  const right = await pickAd("side_right", { exclude: left ? [left.id] : [] });
  return (
    <div className="site-shell">
      <aside className="rail rail-left" aria-label="Reklam alanı">
        {left && <div className="rail-sticky"><AdView ad={left} placement="side_left" /></div>}
      </aside>
      <div className="site-main">
        {/* Klavye ve ekran okuyucu kullanıcıları için menüyü atlayıp içeriğe geçiş */}
        <a href="#main" className="skip-link">İçeriğe geç</a>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <a href="/feed.xml">RSS</a>
        </footer>
      </div>
      <aside className="rail rail-right" aria-label="Reklam alanı">
        {right && <div className="rail-sticky"><AdView ad={right} placement="side_right" /></div>}
      </aside>
    </div>
  );
}
