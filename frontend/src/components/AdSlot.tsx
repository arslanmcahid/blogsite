import { apiGetOrNull } from "@/lib/api";
import type { AdPlacement, PublicAd } from "@/lib/types";
import { AdView } from "./AdView";

/** Bu yer için o an yayında bir reklam varsa gösterir; yoksa hiçbir şey çizmez (boşluk bırakmaz). */
export async function AdSlot({ placement }: { placement: AdPlacement }) {
  let ad: PublicAd | null = null;
  try {
    ad = (await apiGetOrNull<{ ad: PublicAd | null }>(`/api/sponsor/pick/?placement=${placement}`))?.ad ?? null;
  } catch {
    return null; // reklam hatası sayfayı bozmasın
  }
  return ad ? <AdView ad={ad} placement={placement} /> : null;
}
