"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { HOME_TITLE } from "@/lib/site";

// Boşluklar bölünmeyen boşluktur (NBSP): tarayıcı sıradan boşlukları sekme başlığında tek boşluğa indirir.
const SEPARATOR = "   •   ";
const STEP_MS = 400;

/**
 * Yalnızca ANA SAYFADA sekme başlığını kayan yazı gibi akıtır; diğer sayfalar kendi (sabit) adını gösterir.
 * Hareketi azaltma tercihi açıksa ve arama motoru/test botlarında çalışmaz, böylece botların gördüğü başlık
 * bozulmaz. Sunucudan gelen asıl başlık (SEO) hiç değişmez; akan metin sadece tarayıcıda, sonradan yazılır.
 */
export function TitleMarquee() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent)) return;

    // Başlığı geri okumuyoruz: ana sayfanın başlığı sabit olduğu için doğrudan sabitten türetilir.
    const text = HOME_TITLE + SEPARATOR;
    let offset = 0;
    const timer = setInterval(() => {
      // Sayfa değiştiyse başka sayfanın başlığını ezme.
      if (window.location.pathname !== "/") return;
      offset = (offset + 1) % text.length;
      document.title = text.slice(offset) + text.slice(0, offset);
    }, STEP_MS);

    // Sayfadan ayrılırken yeni sayfanın başlığını Next kendisi yazar; biz sadece zamanlayıcıyı durdururuz.
    return () => clearInterval(timer);
  }, [pathname]);

  return null;
}
