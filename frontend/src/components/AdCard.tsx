import type { PublicAd } from "@/lib/types";

/**
 * Reklamın görünüşü (hem sitede hem yönetim önizlemesinde aynı). Reklam olduğu her zaman
 * açıkça belirtilir; bu hem Reklam Kurulu kurallarına uyar hem ziyaretçiye dürüsttür.
 */
export function AdCard({ ad }: { ad: Pick<PublicAd, "kind" | "name" | "title" | "body" | "cta" | "image_url" | "image_width" | "image_height"> }) {
  if (ad.kind === "banner") {
    const ratio = ad.image_width && ad.image_height ? `${ad.image_width} / ${ad.image_height}` : undefined;
    return (
      <span className="ad ad-banner">
        <span className="ad-label">Reklam</span>
        {ad.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.image_url} alt={ad.title || ad.name} style={{ aspectRatio: ratio }} loading="lazy" />
        )}
      </span>
    );
  }
  return (
    <span className="ad ad-text">
      <span className="ad-label">Reklam · {ad.name}</span>
      <span className="ad-inner">
        {ad.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ad-thumb" src={ad.image_url} alt="" loading="lazy" />
        )}
        <span className="ad-copy">
          <strong>{ad.title}</strong>
          {ad.body && <span>{ad.body}</span>}
          {ad.cta && <span className="ad-cta">{ad.cta} →</span>}
        </span>
      </span>
    </span>
  );
}
