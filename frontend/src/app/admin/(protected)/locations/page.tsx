"use client";

import { useState } from "react";
import { LocationPickerMap } from "@/components/admin/LocationPickerMap";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { Location } from "@/lib/types";

export default function LocationsAdminPage() {
  const { data, error, loading, reload } = useApi<Location[]>("/api/locations/");
  const [name, setName] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function add() {
    if (!point || !name.trim()) return;
    try {
      await adminFetch("/api/locations/", {
        method: "POST",
        json: { name: name.trim(), latitude: point.lat.toFixed(6), longitude: point.lng.toFixed(6) },
      });
      setName("");
      setPoint(null);
      setMsg({ ok: true, text: "Konum eklendi." });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  async function remove(l: Location) {
    if (!confirm(`"${l.name}" silinsin mi? Yazılardaki etiketi de kalkar.`)) return;
    try {
      await adminFetch(`/api/locations/${l.id}/`, { method: "DELETE" });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  async function rename(l: Location, newName: string) {
    if (!newName.trim() || newName === l.name) return;
    try {
      await adminFetch(`/api/locations/${l.id}/`, { method: "PATCH", json: { name: newName.trim() } });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  return (
    <div className="editor">
      <div className="toolbar"><h1>Konumlar</h1></div>
      {msg && <p className={msg.ok ? "admin-ok" : "admin-error"} role="status">{msg.text}</p>}

      <div className="panel stack">
        <h2>Yeni konum</h2>
        <p className="muted small">Haritaya tıklayarak noktayı seç, ad ver ve ekle.</p>
        <LocationPickerMap locations={data ?? []} pending={point} onPick={setPoint} />
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Konum adı (örn. Kapadokya)" aria-label="Konum adı" />
          <span className="muted small">{point ? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}` : "Nokta seçilmedi"}</span>
          <button className="btn primary" onClick={add} disabled={!point || !name.trim()}>Ekle</button>
        </div>
      </div>

      <div className="panel stack">
        <h2>Kayıtlı konumlar</h2>
        {loading && <p className="muted">Yükleniyor…</p>}
        {error && <p className="admin-error">{error.message}</p>}
        {data?.length === 0 && <p className="muted">Henüz konum yok.</p>}
        {data?.map((l) => (
          <div className="row loc-row" key={`${l.id}-${l.name}`}>
            <input defaultValue={l.name} aria-label="Konum adı" onBlur={(e) => rename(l, e.target.value)} />
            <span className="muted small">{Number(l.latitude).toFixed(4)}, {Number(l.longitude).toFixed(4)}</span>
            <button className="btn danger small" onClick={() => remove(l)}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}
