"use client";

import { useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { AdminImage } from "@/lib/types";

function Library({ onSelect }: { onSelect: (img: AdminImage) => void }) {
  const { data, error, loading } = useApi<AdminImage[]>("/api/images/");
  if (loading) return <p className="muted">Kütüphane yükleniyor…</p>;
  if (error) return <p className="admin-error">{error.message}</p>;
  if (!data?.length) return <p className="muted">Kütüphane boş. Yukarıdan görsel yükle.</p>;
  return (
    <div className="library">
      {data.map((img) => (
        <button type="button" key={img.id} onClick={() => onSelect(img)} title={img.alt || img.url}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.alt} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

/**
 * Görsel yükle veya kütüphaneden seç. `multiple` açıkken birden fazla dosya
 * yüklenebilir ve panel açık kalır (galeri için).
 */
export function ImagePicker({
  onPick,
  multiple = false,
  label = "Görsel seç",
}: {
  onPick: (img: AdminImage) => void;
  multiple?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pick(img: AdminImage) {
    onPick(img);
    if (!multiple) setOpen(false);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        pick(await adminFetch<AdminImage>("/api/images/", { method: "POST", form }));
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <button type="button" className="btn" onClick={() => setOpen(true)}>{label}</button>;
  }
  return (
    <div className="picker">
      <div className="picker-head">
        <label className="btn primary">
          {busy ? "Yükleniyor…" : "Bilgisayardan yükle"}
          <input type="file" accept="image/*" multiple={multiple} hidden disabled={busy} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Kapat</button>
      </div>
      {error && <p className="admin-error">{error}</p>}
      <p className="muted small">veya kütüphaneden seç:</p>
      <Library onSelect={pick} />
    </div>
  );
}
