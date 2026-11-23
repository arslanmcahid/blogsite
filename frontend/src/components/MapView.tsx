"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Location } from "@/lib/types";

// Leaflet tarayıcıya (window) ihtiyaç duyar; bu yüzden sadece istemcide, effect içinde yüklenir.
export function MapView({
  locations,
  height = 320,
}: {
  locations: Location[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || locations.length === 0) return;
    let map: import("leaflet").Map | undefined;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap katkıda bulunanlar",
        maxZoom: 18,
      }).addTo(map);
      const points = locations.map((l) => {
        const ll: [number, number] = [Number(l.latitude), Number(l.longitude)];
        // Varsayılan marker ikonu bundler ile bozulduğu için daire işaretçi kullanıyoruz.
        L.circleMarker(ll, {
          radius: 9,
          color: "#b4441c",
          fillColor: "#e8743b",
          fillOpacity: 0.9,
        })
          .bindPopup(l.name)
          .addTo(map!);
        return ll;
      });
      if (points.length === 1) map.setView(points[0], 11);
      else map.fitBounds(points, { padding: [30, 30] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [locations]);

  if (locations.length === 0) return null;
  return (
    <div
      ref={ref}
      className="map"
      style={{ height }}
      role="img"
      aria-label="Konum haritası"
    />
  );
}
