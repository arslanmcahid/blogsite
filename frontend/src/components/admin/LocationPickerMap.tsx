"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "@/lib/types";

type LatLng = { lat: number; lng: number };

/** Haritaya tıklayınca onPick çağrılır; mevcut konumlar mavi, seçilen nokta turuncu görünür. */
export function LocationPickerMap({ locations, pending, onPick }: { locations: Location[]; pending: LatLng | null; onPick: (p: LatLng) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const libRef = useRef<typeof Leaflet | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Haritayı bir kez kur
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      libRef.current = L;
      const map = L.map(el.current).setView([39, 35], 5); // Türkiye
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap katkıda bulunanlar",
        maxZoom: 18,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e) => {
        const { lat, lng } = e.latlng.wrap();
        onPickRef.current({ lat, lng });
      });
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // İşaretçileri güncelle
  useEffect(() => {
    const L = libRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();
    locations.forEach((l) =>
      L.circleMarker([Number(l.latitude), Number(l.longitude)], { radius: 8, color: "#1d4f91", fillColor: "#3b82e8", fillOpacity: 0.85 })
        .bindTooltip(l.name)
        .addTo(layer),
    );
    if (pending) L.circleMarker([pending.lat, pending.lng], { radius: 10, color: "#b4441c", fillColor: "#e8743b", fillOpacity: 0.95 }).addTo(layer);
  }, [ready, locations, pending]);

  return <div ref={el} className="map" style={{ height: 380, cursor: "crosshair" }} role="application" aria-label="Konum seçmek için haritaya tıkla" />;
}
