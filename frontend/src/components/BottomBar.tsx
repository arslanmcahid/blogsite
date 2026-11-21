"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicAd } from "@/lib/types";
import { AdView } from "./AdView";

const KEY = "ad-bar-closed";

/** Ekranın altında, ziyaretçi kaydırırken hep görünen reklam şeridi. Kapatılırsa bu oturumda tekrar çıkmaz. */
export function BottomBar({ ad }: { ad: PublicAd }) {
  const [closed, setClosed] = useState(false);
  // Önceden kapatıldıysa (aynı oturumda) gizle; sunucu çıktısıyla uyuşsun diye açılıştan sonra okunur.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (sessionStorage.getItem(KEY) === "1") setClosed(true);
      } catch {
        /* depolama kapalıysa her sayfada gösterilir */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  if (closed) return null;
  return (
    <div className="ad-bar" role="complementary" aria-label="Reklam">
      <AdView ad={ad} placement="bottom_bar" />
      <button
        type="button"
        className="ad-bar-close"
        aria-label="Reklamı kapat"
        onClick={() => {
          setClosed(true);
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            /* yoksay */
          }
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
