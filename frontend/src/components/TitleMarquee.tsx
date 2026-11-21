"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { HOME_TITLE } from "@/lib/site";

// Boşluklar bölünmeyen boşluktur (NBSP): tarayıcı sıradan boşlukları sekme başlığında tek boşluğa indirir.
const SEPARATOR = "   •   ";
const STEP_MS = 300; // bir harf kayma süresi: okunabilir, telaşsız bir hız
const HOLD_MS = 4000; // tam başlık her turdan sonra bu kadar sabit durur

/**
 * Yalnızca ANA SAYFADA sekme başlığını yumuşakça akıtır: başlık önce birkaç saniye tam okunur,
 * sonra harf harf kayar, bir tur bitince yine durup bekler. (Sekme başlığı yalnızca metindir;
 * piksel piksel akıcı bir animasyon tarayıcılarda mümkün değil, en yumuşağı budur.)
 * Diğer sayfalar kendi sabit adını gösterir. Hareketi azaltma tercihi açıksa ve arama motoru/test
 * botlarında çalışmaz; sunucudan gelen asıl başlık (SEO) hiç değişmez.
 */
export function TitleMarquee() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent)) return;

    const text = HOME_TITLE + SEPARATOR;
    let timer: ReturnType<typeof setTimeout>;

    const hold = () => {
      timer = setTimeout(() => scroll(1), HOLD_MS);
    };
    const scroll = (offset: number) => {
      // Sayfa değiştiyse başka sayfanın başlığını ezme.
      if (window.location.pathname !== "/") return;
      if (offset >= text.length) {
        document.title = HOME_TITLE;
        hold();
        return;
      }
      document.title = text.slice(offset) + text.slice(0, offset);
      timer = setTimeout(() => scroll(offset + 1), STEP_MS);
    };

    hold();
    // Sayfa değişince zamanlayıcıyı durdururuz; yeni sayfanın başlığını Next kendisi yazar.
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
