"use client";

import { useState } from "react";
import { LocationPickerMap } from "@/components/admin/LocationPickerMap";
import { useToast } from "@/components/admin/Toast";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { Location } from "@/lib/types";

export default function LocationsAdminPage() {
  const { data, error, loading, reload } = useApi<Location[]>("/api/locations/");
  const [name, setName] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const toast = useToast();

  async function add() {
    if (!point || !name.trim()) return;
    try {
      await adminFetch("/api/locations/", {
        method: "POST",
        json: { name: name.trim(), latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6) },
      });
      setName("");
      setPoint(null);
      toast.success("Konum eklendi.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove(l: Location) {
    if (!confirm(`“${l.name}” silinsin mi? Yazılardaki etiketi de kalkar.`)) return;
    try {
      await adminFetch(`/api/locations/${l.id}/`, { method: "DELETE" });
      toast.success("Konum silindi.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function rename(l: Location, newName: string) {
    if (!newName.trim() || newName === l.name) return;
    try {
      await adminFetch(`/api/locations/${l.id}/`, { method: "PATCH", json: { name: newName.trim() } });
      toast.success("Ad güncellendi.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="form-grid">
      <div className="form-main">
        <div className="card stack" data-tour="loc-add">
          <h2>Haritaya yeni bir yer ekle</h2>
          <p className="muted small" style={{ margin: 0 }}>Haritada yerin üzerine tıkla, ona bir ad ver ve “Ekle”ye bas. Konumları yazılarında etiket olarak kullanabilirsin.</p>
          <LocationPickerMap locations={data ?? []} pending={point} onPick={setPoint} />
          <div className="row">
            <input style={{ flex: 1, minWidth: 180 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Konum adı (örn. Kapadokya)" aria-label="Konum adı" />
            <span className="muted small">{point ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : "Haritadan bir yer seç"}</span>
            <button className="btn primary" onClick={add} disabled={!point || !name.trim()}>Ekle</button>
          </div>
        </div>
      </div>

      <aside className="form-side">
        <div className="card stack">
          <h2>Eklediğin yerler ({data?.length ?? 0})</h2>
          {loading && <p className="muted">Yükleniyor…</p>}
          {error && <p className="admin-error">{error.message}</p>}
          {data?.length === 0 && <p className="muted small" style={{ margin: 0 }}>Henüz bir yer eklemedin.</p>}
          {data?.map((l) => (
            <div className="row loc-row" key={`${l.id}-${l.name}`}>
              <input defaultValue={l.name} aria-label="Konum adı" onBlur={(e) => rename(l, e.target.value)} />
              <button className="btn small danger" onClick={() => remove(l)}>Sil</button>
              <span className="muted small" style={{ flexBasis: "100%", marginTop: -6 }}>{Number(l.latitude).toFixed(4)}, {Number(l.longitude).toFixed(4)}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
