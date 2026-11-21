import { AD_FORMATS, type Ad, type AdFormat, type AdPlacement } from "./types";

export const STATUS_LABEL: Record<Ad["status"], string> = { running: "Yayında", scheduled: "Planlı", ended: "Süresi doldu", paused: "Duraklatıldı" };
const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "");
export const periodText = (a: Pick<Ad, "starts_on" | "ends_on">) =>
  a.starts_on || a.ends_on ? `${fmt(a.starts_on) || "—"} → ${fmt(a.ends_on) || "süresiz"}` : "Süresiz";
export const ctr = (views: number | null, clicks: number | null) => (views ? `%${(((clicks ?? 0) / views) * 100).toFixed(1)}` : "—");


/** Yerleşime uygun biçim adayları (sistem, görselin oranına en yakın olanı seçer). */
const CANDIDATES: Record<"side" | "content", AdFormat[]> = {
  side: ["tall", "rect"],
  content: ["leaderboard", "billboard", "rect"],
};

export const isSide = (p: AdPlacement) => p === "side_left" || p === "side_right";

/**
 * "Otomatik" biçim: görselin kendi oranına en yakın uygun biçim, böylece en az kırpılır.
 * Görsel boyutu bilinmiyorsa kırpılmaz ("auto").
 */
export function autoFormat(placement: AdPlacement, w: number | null, h: number | null): AdFormat {
  if (!w || !h) return "auto";
  const img = Math.log(w / h);
  let best: AdFormat = "auto";
  let bestD = Infinity;
  for (const id of CANDIDATES[isSide(placement) ? "side" : "content"]) {
    const f = AD_FORMATS.find((x) => x.id === id)!;
    const d = Math.abs(img - Math.log(f.w / f.h));
    if (d < bestD) {
      best = id;
      bestD = d;
    }
  }
  return best;
}

export const resolveFormat = (format: AdFormat, placement: AdPlacement, w: number | null, h: number | null): AdFormat =>
  format !== "auto" ? format : autoFormat(placement, w, h);

/** Görselin hangi bölümünün kalacağı (görsele göre yüzde). Biçim oranına kırpılır, odak ortada kalmaya çalışır. */
export function cropBox(format: AdFormat, w: number, h: number, fx: number, fy: number) {
  const f = AD_FORMATS.find((x) => x.id === format);
  if (!f || !f.w) return { left: 0, top: 0, width: 100, height: 100 };
  const target = f.w / f.h;
  const img = w / h;
  if (target > img) {
    const height = (img / target) * 100; // hedef daha yatay: yükseklikten kırp
    return { left: 0, top: (100 - height) * (fy / 100), width: 100, height };
  }
  const width = (target / img) * 100; // hedef daha dikey: genişlikten kırp
  return { left: (100 - width) * (fx / 100), top: 0, width, height: 100 };
}
