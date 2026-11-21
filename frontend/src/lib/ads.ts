import type { Ad } from "./types";

export const STATUS_LABEL: Record<Ad["status"], string> = { running: "Yayında", scheduled: "Planlı", ended: "Süresi doldu", paused: "Duraklatıldı" };
const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "");
export const periodText = (a: Pick<Ad, "starts_on" | "ends_on">) =>
  a.starts_on || a.ends_on ? `${fmt(a.starts_on) || "—"} → ${fmt(a.ends_on) || "süresiz"}` : "Süresiz";
export const ctr = (views: number | null, clicks: number | null) => (views ? `%${(((clicks ?? 0) / views) * 100).toFixed(1)}` : "—");

