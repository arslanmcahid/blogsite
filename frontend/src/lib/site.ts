// Sitenin herkese açık adresi (canonical, sitemap, RSS ve paylaşım kartları için).
// Production'da SITE_URL ortam değişkeniyle verilir, örn. https://ornek.com
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "Yazdedik";
// Ana sayfanın sekme başlığı (akan yazı olarak da bu gösterilir). Diğer sayfalar kendi adını gösterir.
export const HOME_TITLE = `${SITE_NAME} · Köşe Yazıları, fotoğraflar ve gezi notları`;
// Sekmede akan, daha uzun metin (arama motorlarının gördüğü asıl başlık yukarıdaki kısa olandır).
export const MARQUEE_TEXT = `${HOME_TITLE} · Düşünceler, kareler ve yolculuklar`;
export const SITE_DESCRIPTION = "Kişisel blog: yazılar, fotoğraf sergileri ve gezi notları.";
