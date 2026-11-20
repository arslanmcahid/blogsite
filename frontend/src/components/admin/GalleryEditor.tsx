"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, errorMessage, uploadImage, useApi } from "@/lib/admin-api";
import { newId } from "@/lib/editor-model";
import type { Gallery, Location } from "@/lib/types";
import { DropZone } from "./DropZone";
import { ImagePicker } from "./ImagePicker";
import { DragHandle, SortableList } from "./Sortable";
import { useToast } from "./Toast";

type Item = { id: string; image: number; url: string; caption: string };

function GalleryForm({ gallery, locations }: { gallery: Gallery | null; locations: Location[] }) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(
    () => ({
      title: gallery?.title ?? "",
      description: gallery?.description ?? "",
      published: gallery?.is_published ?? false,
      location: gallery?.location ?? (null as number | null),
      items: gallery?.items.map((i) => ({ id: newId(), image: i.image, url: i.url, caption: i.caption })) ?? ([] as Item[]),
    }),
    [gallery],
  );
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [published, setPublished] = useState(initial.published);
  const [location, setLocation] = useState(initial.location);
  const [items, setItems] = useState<Item[]>(initial.items);
  const [slug, setSlug] = useState(gallery?.slug ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const payload = { title: title.trim(), description, is_published: published, location, items: items.map((i) => ({ image: i.image, caption: i.caption })) };
  const snapshot = JSON.stringify(payload);
  const [saved, setSaved] = useState(snapshot);
  const dirty = snapshot !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!title.trim()) return toast.error("Önce sergiye bir ad ver.");
    setBusy(true);
    try {
      const res = slug
        ? await adminFetch<Gallery>(`/api/galleries/${encodeURIComponent(slug)}/`, { method: "PATCH", json: payload })
        : await adminFetch<Gallery>("/api/galleries/", { method: "POST", json: payload });
      setSaved(snapshot);
      toast.success(published ? "Sergi kaydedildi ve yayında." : "Sergi taslak olarak kaydedildi.");
      if (!slug) {
        setSlug(res.slug);
        window.history.replaceState(null, "", `/admin/galleries/${encodeURIComponent(res.slug)}`);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!slug || !confirm("Bu sergi silinsin mi? Fotoğraflar kütüphanende kalır.")) return;
    try {
      await adminFetch(`/api/galleries/${encodeURIComponent(slug)}/`, { method: "DELETE" });
      toast.success("Sergi silindi.");
      router.replace("/admin/galleries");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function addFiles(files: File[]) {
    setUploading(true);
    for (const file of files) {
      try {
        const img = await uploadImage(file);
        setItems((cur) => [...cur, { id: newId(), image: img.id, url: img.url, caption: img.alt }]);
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }
    setUploading(false);
  }

  return (
    <div className="editor">
      <div className="toolbar">
        <Link href="/admin/galleries" className="back muted">← Sergiler</Link>
        <h1>{slug ? "Sergiyi düzenle" : "Yeni fotoğraf sergisi"}</h1>
        <span className="spacer" />
        <span className="save-state">{busy ? "Kaydediliyor…" : dirty ? "Kaydedilmemiş değişiklikler var" : slug ? "✓ Kaydedildi" : ""}</span>
        {slug && published && <Link className="btn" href={`/galeri/${encodeURIComponent(slug)}`} target="_blank">Sitede gör ↗</Link>}
        <button className="btn primary" onClick={save} disabled={busy || !dirty && !!slug}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>

      <div className="panel stack">
        <label>Sergi adı<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn. Kapadokya'da bir sabah" /></label>
        <label>Kısa tanıtım <span className="muted">(isteğe bağlı)</span><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="grid2">
          <label>Çekildiği yer
            <select value={location ?? ""} onChange={(e) => setLocation(e.target.value ? Number(e.target.value) : null)}>
              <option value="">— belirtme —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Ziyaretçiler görebilsin (yayınla)</label>
        </div>
      </div>

      <div className="panel stack">
        <h2>Fotoğraflar ({items.length})</h2>
        <DropZone onFiles={addFiles} hint="Fotoğrafları bırak, sergiye eklensin">
          <div className="stack">
            {items.length === 0 && <div className="empty-state"><span className="emoji">📷</span>Fotoğrafları buraya sürükleyip bırak ya da aşağıdan seç.</div>}
            {items.length > 0 && <p className="muted small">Sırayı değiştirmek için ⠿ simgesinden tutup sürükle. Sergide bu sırayla görünürler.</p>}
            <SortableList items={items} onChange={setItems} layout="grid" className="gal-items">
              {(it, i, handle, dragging) => (
                <div className={`gal-item ${dragging ? "dragging" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt="" />
                  <input value={it.caption} aria-label={`${i + 1}. fotoğrafın alt yazısı`} placeholder="Alt yazı" onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, caption: e.target.value } : x)))} />
                  <div className="row">
                    <DragHandle handle={handle} label="Sürükleyerek sırala" />
                    <span className="spacer" />
                    <button type="button" className="icon danger" aria-label="Sergiden çıkar" title="Sergiden çıkar" onClick={() => setItems(items.filter((x) => x.id !== it.id))}>🗑</button>
                  </div>
                </div>
              )}
            </SortableList>
            <div className="row">
              <ImagePicker multiple label="＋ Fotoğraf ekle" onPick={(img) => setItems((cur) => [...cur, { id: newId(), image: img.id, url: img.url, caption: img.alt }])} />
              {uploading && <span className="muted small">Yükleniyor…</span>}
            </div>
          </div>
        </DropZone>
      </div>

      {slug && (
        <div className="panel stack">
          <h2>Sergiyi sil</h2>
          <p className="muted small">Fotoğraflar kütüphanende kalır, yalnızca sergi kalkar.</p>
          <div><button className="btn danger" onClick={remove}>Bu sergiyi sil</button></div>
        </div>
      )}
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
