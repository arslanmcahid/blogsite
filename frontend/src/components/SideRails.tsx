import { pickAd } from "@/lib/api";
import { AdView } from "./AdView";

/**
 * Geniş ekranlarda içeriğin iki yanındaki boşlukta duran reklamlar. Ekrana sabitlidir:
 * ziyaretçi sayfayı kaydırırken de görünür kalırlar. Ana sayfa ve yazı sayfası ayrı yerleşimlerdir.
 */
export async function SideRails({ kind }: { kind: "home" | "post" }) {
  const left = await pickAd(`${kind}_left`);
  // Sağ ve sol aynı reklamı göstermesin.
  const right = await pickAd(`${kind}_right`, {
    exclude: left ? [left.id] : [],
  });
  return (
    <>
      {left && (
        <aside className="rail rail-left" aria-label="Reklam">
          <AdView ad={left} placement={`${kind}_left`} />
        </aside>
      )}
      {right && (
        <aside className="rail rail-right" aria-label="Reklam">
          <AdView ad={right} placement={`${kind}_right`} />
        </aside>
      )}
    </>
  );
}
