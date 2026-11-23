"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { HOME_TITLE, MARQUEE_TEXT } from "@/lib/site";

// Ayraç: ince boşluklar (U+2009). Sıradan boşluklar sekme başlığında tek boşluğa indirilir, bunlar indirilmez.
const SEPARATOR = "  •  ";
// Saç teli boşluğu (U+200A): yaklaşık 1 piksel genişliğinde. Başlığın soluna eklenip her karede azaltılarak
// bir harflik kaymanın ARASI doldurulur; yani metin harf harf sıçramak yerine pikselce kayar.
const HAIR = " ";
const STEP_MS = 28; // her kare (bir harf kayması = alt adım sayısı kadar kare)
const HOLD_MS = 2500; // tam başlık her turdan sonra bu kadar sabit durur

/**
 * Her harf için, genişliği kaç saç teli boşluğuna denk geliyorsa o kadar alt adım kullanılır (dar harf az, geniş harf
 * çok adım), böylece her karede metin hep aynı (yaklaşık 1 piksel) kayar. Ölçüm cihazın sistem yazı tipiyle yapılır
 * (sekmede de o kullanılır); ölçülemezse her harf için 6 alınır.
 */
function subStepsPerChar(text: string): number[] {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = "13px system-ui";
      const hair = ctx.measureText(HAIR).width;
      if (hair > 0)
        return [...text].map((ch) =>
          Math.min(
            12,
            Math.max(2, Math.round(ctx.measureText(ch).width / hair)),
          ),
        );
    }
  } catch {
    /* ölçülemezse aşağıdaki varsayılan */
  }
  return [...text].map(() => 6);
}

/**
 * Yalnızca ANA SAYFADA sekme başlığını akıtır: başlık önce birkaç saniye tam okunur, sonra pikselce kayar,
 * tur bitince yine bekler. Diğer sayfalar kendi sabit adını gösterir. Hareketi azaltma tercihi açıksa ve
 * arama motoru/test botlarında çalışmaz; sunucudan gelen asıl başlık (SEO) hiç değişmez.
 * Not: tarayıcılar arka plandaki sekmelerde zamanlayıcıyı saniyede ~1'e düşürür, orada akış yavaşlar.
 */
export function TitleMarquee() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (
      /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(
        navigator.userAgent,
      )
    )
      return;

    const text = MARQUEE_TEXT + SEPARATOR;
    // Kare planı: metin f saç teli kadar sola kaymış olmalı. Başa boşluk ekleyerek sola kaydıramayız, bu yüzden
    // bir harf fazla döndürüp soluna (n − r) saç teli ekleriz (n: o harfin alt adım sayısı, r: harf içindeki ilerleme).
    const counts = subStepsPerChar(text);
    const plan: { off: number; pad: number }[] = [];
    counts.forEach((n, c) => {
      for (let r = 0; r < n; r++)
        plan.push(r === 0 ? { off: c, pad: 0 } : { off: c + 1, pad: n - r });
    });
    let timer: ReturnType<typeof setTimeout>;

    const hold = () => {
      timer = setTimeout(() => frame(1), HOLD_MS);
    };

    const frame = (f: number) => {
      // Sayfa değiştiyse başka sayfanın başlığını ezme.
      if (window.location.pathname !== "/") return;
      if (f >= plan.length) {
        document.title = HOME_TITLE;
        hold();
        return;
      }
      const { off, pad } = plan[f];
      document.title = HAIR.repeat(pad) + text.slice(off) + text.slice(0, off);
      timer = setTimeout(() => frame(f + 1), STEP_MS);
    };

    hold();
    // Sayfa değişince zamanlayıcıyı durdururuz; yeni sayfanın başlığını Next kendisi yazar.
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
