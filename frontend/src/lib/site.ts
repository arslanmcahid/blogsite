// Sitenin herkese açık adresi (canonical, sitemap, RSS ve paylaşım kartları için).
// Production'da SITE_URL ortam değişkeniyle verilir, örn. https://ornek.com
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Blog";
export const SITE_DESCRIPTION = "Kişisel blog: yazılar, fotoğraf sergileri ve gezi notları.";
