import { pickAd } from "@/lib/api";
import type { AdPlacement } from "@/lib/types";
import { AdView } from "./AdView";

/** Bu yer için o an yayında bir reklam varsa gösterir; yoksa hiçbir şey çizmez (boşluk bırakmaz). */
export async function AdSlot({ placement, pin }: { placement: AdPlacement; pin?: number }) {
  const ad = await pickAd(placement, { pin });
  return ad ? <AdView ad={ad} placement={placement} /> : null;
}
