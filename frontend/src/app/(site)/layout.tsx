import { BottomBar } from "@/components/BottomBar";
import { SiteHeader } from "@/components/SiteHeader";
import { pickAd } from "@/lib/api";

// İçerik admin panelinden sürekli değişir; sayfalar build anında dondurulmasın,
// her istekte backend'den taze okunsun (aynı zamanda bilinmeyen adreslere gerçek 404 döner).
export const dynamic = "force-dynamic";

// Herkese açık sayfaların ortak çerçevesi. Yönetim paneli (/admin) bu grubun dışında,
// kendi kenar çubuğuyla çalışır. Yan reklamlar sayfalara göre ayrı (bkz. SideRails).
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const bar = await pickAd("bottom_bar");
  return (
    <div className={bar ? "has-bar" : undefined}>
      {/* Klavye ve ekran okuyucu kullanıcıları için menüyü atlayıp içeriğe geçiş */}
      <a href="#main" className="skip-link">İçeriğe geç</a>
      <SiteHeader />
      {children}
      <footer className="site-footer">
        <a href="/feed.xml">RSS</a>
      </footer>
      {bar && <BottomBar ad={bar} />}
    </div>
  );
}
