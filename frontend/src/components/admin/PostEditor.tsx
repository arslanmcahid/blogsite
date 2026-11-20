"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import type { AdminImage, Block, GallerySummary, Location, Post, PostTheme } from "@/lib/types";
import { BlockEditor } from "./BlockEditor";
import { ImagePicker } from "./ImagePicker";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Cover = { id: number; url: string } | null;

function PostForm({ post, locations, galleries }: { post: Post | null; locations: Location[]; galleries: GallerySummary[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState(toLocalInput(post?.published_at ?? null));
  const [cover, setCover] = useState<Cover>(post?.cover_url ? { id: post.cover!, url: post.cover_url } : null);
  const [blocks, setBlocks] = useState<Block[]>(post?.blocks ?? []);
  const [theme, setTheme] = useState<PostTheme>(post?.theme ?? {});
  const [locIds, setLocIds] = useState<number[]>(post?.location_details.map((l) => l.id) ?? []);
  const [slug, setSlug] = useState(post?.slug ?? null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        title,
        excerpt,
        status,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        cover: cover?.id ?? null,
        blocks,
        theme,
        locations: locIds,
      };
      const saved = slug
        ? await adminFetch<Post>(`/api/posts/${encodeURIComponent(slug)}/`, { method: "PATCH", json: payload })
        : await adminFetch<Post>("/api/posts/", { method: "POST", json: payload });
      setPublishedAt(toLocalInput(saved.published_at));
      setMsg({ ok: true, text: "Kaydedildi." });
      if (!slug) {
        setSlug(saved.slug);
        router.replace(`/admin/posts/${encodeURIComponent(saved.slug)}`);
      }
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!slug || !confirm("Bu yazı kalıcı olarak silinecek. Emin misin?")) return;
    try {
      await adminFetch(`/api/posts/${encodeURIComponent(slug)}/`, { method: "DELETE" });
      router.replace("/admin");
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  }

  const toggleLoc = (id: number) => setLocIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className="editor">
      <div className="toolbar">
        <h1>{slug ? "Yazıyı düzenle" : "Yeni yazı"}</h1>
        <span className="spacer" />
        {slug && status === "published" && <Link className="btn" href={`/yazilar/${slug}`} target="_blank">Yayındaki sayfa ↗</Link>}
        {slug && <button className="btn danger" onClick={remove}>Sil</button>}
        <button className="btn primary" onClick={save} disabled={busy || !title.trim()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>
      {msg && <p className={msg.ok ? "admin-ok" : "admin-error"} role="status">{msg.text}</p>}

      <div className="panel stack">
        <label>Başlık<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Yazının başlığı" /></label>
        <label>Özet<textarea rows={2} maxLength={400} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Listelerde ve paylaşımlarda görünen kısa açıklama" /></label>
        <div className="grid2">
          <label>Durum
            <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
            </select>
          </label>
          <label>Yayın tarihi (boşsa kaydedince şimdi)
            <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="panel stack">
        <h2>Kapak görseli</h2>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thumb" src={cover.url} alt="" />
        )}
        <div className="row">
          <ImagePicker label={cover ? "Kapağı değiştir" : "Kapak seç"} onPick={(img: AdminImage) => setCover({ id: img.id, url: img.url })} />
          {cover && <button type="button" className="btn" onClick={() => setCover(null)}>Kaldır</button>}
        </div>
      </div>

      <div className="panel stack">
        <h2>İçerik blokları</h2>
        <BlockEditor value={blocks} onChange={setBlocks} ctx={{ galleries, locations }} />
      </div>

      <div className="panel stack">
        <h2>Tasarım</h2>
        <div className="grid3">
          <label>Yazı tipi
            <select value={theme.font ?? "serif"} onChange={(e) => setTheme({ ...theme, font: e.target.value as PostTheme["font"] })}>
              <option value="serif">Serif (kitap gibi)</option>
              <option value="sans">Sans (modern)</option>
            </select>
          </label>
          <label>İçerik genişliği
            <select value={theme.width ?? "normal"} onChange={(e) => setTheme({ ...theme, width: e.target.value as PostTheme["width"] })}>
              <option value="narrow">Dar</option>
              <option value="normal">Normal</option>
              <option value="wide">Geniş (gazete için)</option>
            </select>
          </label>
          <label>Vurgu rengi
            <span className="row">
              <input type="color" value={theme.accent ?? "#b4441c"} onChange={(e) => setTheme({ ...theme, accent: e.target.value })} />
              {theme.accent && <button type="button" className="btn small" onClick={() => setTheme({ ...theme, accent: undefined })}>Varsayılan</button>}
            </span>
          </label>
        </div>
      </div>

      <div className="panel stack">
        <h2>Konum etiketleri</h2>
        {locations.length === 0 ? (
          <p className="muted small">Henüz konum yok. <Link href="/admin/locations">Konumlar</Link> sayfasından ekleyebilirsin.</p>
        ) : (
          <div className="chips">
            {locations.map((l) => (
              <label key={l.id} className={`chip ${locIds.includes(l.id) ? "on" : ""}`}>
                <input type="checkbox" checked={locIds.includes(l.id)} onChange={() => toggleLoc(l.id)} /> 📍 {l.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PostEditor({ slug }: { slug?: string }) {
  const post = useApi<Post>(slug ? `/api/posts/${encodeURIComponent(slug)}/` : null);
  const locs = useApi<Location[]>("/api/locations/");
  const gals = useApi<GallerySummary[]>("/api/galleries/");

  const error = post.error ?? locs.error ?? gals.error;
  if (error) return <p className="admin-error">{error.message}</p>;
  if ((slug && !post.data) || !locs.data || !gals.data) return <p className="muted">Yükleniyor…</p>;
  // key: farklı yazıya geçildiğinde form durumu sıfırlansın
  return <PostForm key={slug ?? "new"} post={post.data ?? null} locations={locs.data} galleries={gals.data} />;
}
