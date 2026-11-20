import type { Metadata } from "next";
import { Suspense } from "react";
import { MapView } from "@/components/MapView";
import { getLocations } from "@/lib/api";

export const metadata: Metadata = { title: "Harita" };

async function AllLocations() {
  const locations = await getLocations();
  if (locations.length === 0) return <p className="muted">Henüz konum etiketi yok.</p>;
  return <MapView locations={locations} height={520} />;
}

export default function MapPage() {
  return (
    <main id="main" className="container">
      <h1>Harita</h1>
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}><AllLocations /></Suspense>
    </main>
  );
}
