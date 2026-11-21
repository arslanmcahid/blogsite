"use client";

import { useEffect, useRef } from "react";
import type { AdPlacement, PublicAd } from "@/lib/types";
import { AdCard } from "./AdCard";

/**
 * Sitedeki reklam: ekranda görününce bir kez gösterim sayar, tıklama sitenin kendi adresinden
 * (sayılıp yönlendirilir). Üçüncü taraf betik ya da çerez yoktur.
 */
export function AdView({ ad, placement }: { ad: PublicAd; placement: AdPlacement }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const send = () => {
      try {
        fetch(`/api/sponsor/${ad.id}/view/?p=${placement}`, { method: "POST", keepalive: true }).catch(() => {});
      } catch {
        /* sayaç hatası sayfayı etkilemesin */
      }
    };
    if (!("IntersectionObserver" in window)) return send();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        send();
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id, placement]);

  return (
    <aside className="ad-slot" aria-label="Reklam">
      <a ref={ref} href={`/api/sponsor/${ad.id}/go/?p=${placement}`} target="_blank" rel="sponsored noopener noreferrer">
        <AdCard ad={ad} />
      </a>
    </aside>
  );
}
