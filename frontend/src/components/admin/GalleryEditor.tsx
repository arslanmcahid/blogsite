"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { Gallery, Location } from "@/lib/types";
import { ImagePicker } from "./ImagePicker";

type Item = { image: number; url: string; caption: string };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

function GalleryForm({ gallery, locations }: { gallery: Gallery | null; locations: Location[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(gallery?.title ?? "");
  const [description, setDescription] = useState(gallery?.description ?? "");
  const [published, setPublished] = useState(gallery?.is_published ?? false);
  const [location, setLocation] = useState<number | null>(gallery?.location ?? null);
  const [items, setItems] = useState<Item[]>(gallery?.items.map((i) => ({ image: i.image, url: i.url, caption: i.caption })) ?? []);
  const [slug, setSlug] = useState(gallery?.slug ?? null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        title,
        description,
        is_published: published,
        location,
        items: items.map((i) => ({ image: i.image, caption: i.caption })),
      };
      const saved = slug
        ? await adminFetch<Gallery>(`/api/galleries/${encodeURIComponent(slug)}/`, { method: "PATCH", json: payload })
        : await adminFetch<Gallery>("/api/galleries/", { method: "POST", json: payload });
      setMsg({ ok: true, text: "Kaydedildi." });
      if (!slug) {
        setSlug(saved.slug);
        router.replace(`/admin/galleries/${encodeURIComponent(saved.slug)}`);
      }
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!slug || !confirm("Bu galeri silinecek (görseller kütüphanede kalır). Emin misin?")) return;
    try {
      await adminFetch(`/api/galleries/${encodeURIComponent(slug)}/`, { method: "DELETE" });
      router.replace("/admin/galleries");
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  return (
    <div className="editor">
      <div className="toolbar">
        <h1>{slug ? "Galeriyi düzenle" : "Yeni galeri"}</h1>
        <span className="spacer" />
        {slug && published && <Link className="btn" href={`/galeri/${slug}`} target="_blank">Yayındaki sayfa ↗</Link>}
        {slug && <button className="btn danger" onClick={remove}>Sil</button>}
        <button className="btn primary" onClick={save} disabled={busy || !title.trim()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>
      {msg && <p className={msg.ok ? "admin-ok" : "admin-error"} role="status">{msg.text}</p>}

      <div className="panel stack">
        <label>Başlık<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sergi adı" /></label>
        <label>Açıklama<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="grid2">
          <label>Konum
            <select value={location ?? ""} onChange={(e) => setLocation(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— yok —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Yayında (ziyaretçilere görünür)</label>
        </div>
      </div>

      <div className="panel stack">
        <h2>Fotoğraflar ({items.length})</h2>
        <p className="muted small">Sıra, burada göründüğü sıradır. Birden fazla dosya aynı anda yüklenebilir.</p>
        <div className="gal-items">
          {items.map((it, i) => (
            <div className="gal-item" key={`${it.image}-${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" />
              <input value={it.caption} placeholder="Alt yazı" onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
              <div className="row">
                <button type="button" className="icon" disabled={i === 0} onClick={() => setItems(move(items, i, i - 1))} title="Öne al">←</button>
                <button type="button" className="icon" disabled={i === items.length - 1} onClick={() => setItems(move(items, i, i + 1))} title="Geriye al">→</button>
                <button type="button" className="icon danger" onClick={() => setItems(items.filter((_, j) => j !== i))} title="Çıkar">✕</button>
              </div>
            </div>
          ))}
        </div>
        <ImagePicker multiple label="+ Fotoğraf ekle" onPick={(img) => setItems((cur) => [...cur, { image: img.id, url: img.url, caption: img.alt }])} />
      </div>
    </div>
  );
}

export function GalleryEditor({ slug }: { slug?: string }) {
  const gallery = useApi<Gallery>(slug ? `/api/galleries/${encodeURIComponent(slug)}/` : null);
  const locs = useApi<Location[]>("/api/locations/");
  const error = gallery.error ?? locs.error;
  if (error) return <p className="admin-error">{error.message}</p>;
  if ((slug && !gallery.data) || !locs.data) return <p className="muted">Yükleniyor…</p>;
  return <GalleryForm key={slug ?? "new"} gallery={gallery.data ?? null} locations={locs.data} />;
}
