"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { type EBlock, TEMPLATES, toApi, toEditor } from "@/lib/editor-model";
import type { Ad, AdminImage, Category, GallerySummary, InfoRow, Location, Post, PostSummary, PostTheme, Source, Tag } from "@/lib/types";
import { BlockEditor } from "./BlockEditor";
import { ImagePicker } from "./ImagePicker";
import { CategoryCard, InfoCard, RelatedCard, SourcesCard, TagsCard } from "./PostExtras";
import { PostPreview } from "./PostPreview";
import { ThemePicker } from "./ThemePicker";
import { useToast } from "./Toast";

type Status = "draft" | "published";
type Cover = { id: number; url: string } | null;

type Draft = {
  title: string;
  excerpt: string;
  status: Status;
  cover: Cover;
  blocks: EBlock[];
  theme: PostTheme;
  locIds: number[];
  categoryId: number | null;
  tagIds: number[];
  sources: Source[];
  info: InfoRow[];
  relatedIds: number[];
  publishedAt: string; // datetime-local biçimi
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function draftFromPost(post: Post | null): Draft {
  return {
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    status: post?.status ?? "draft",
    cover: post?.cover_url && post.cover ? { id: post.cover, url: post.cover_url } : null,
    blocks: toEditor(post?.blocks ?? []),
    theme: post?.theme ?? {},
    locIds: post?.location_details.map((l) => l.id) ?? [],
    categoryId: post?.category ?? null,
    tagIds: post?.tags ?? [],
    sources: post?.sources ?? [],
    info: post?.info ?? [],
    relatedIds: post?.related ?? [],
    publishedAt: toLocalInput(post?.published_at ?? null),
  };
}

/** Sunucuya gidecek veri (kimlikler ve boş bölümler ayıklanmış). */
function payloadOf(d: Draft) {
  return {
    title: d.title.trim(),
    excerpt: d.excerpt,
    status: d.status,
    cover: d.cover?.id ?? null,
    blocks: toApi(d.blocks),
    theme: d.theme,
    locations: d.locIds,
    category: d.categoryId,
    tags: d.tagIds,
    // Boş bırakılan satırlar kaydedilmez.
    sources: d.sources
      .filter((s) => s.text.trim())
      .map((s) => ({ text: s.text.trim(), ...(s.url?.trim() ? { url: s.url.trim() } : {}) })),
    info: d.info.filter((r) => r.label.trim() && r.value.trim()).map((r) => ({ label: r.label.trim(), value: r.value.trim() })),
    related: d.relatedIds,
    published_at: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
  };
}

const snapshotOf = (d: Draft) => JSON.stringify(payloadOf(d));

function PostForm({ post, locations, galleries, allPosts, initialCategories, initialTags, ads, onSaved }: {
  post: Post | null;
  locations: Location[];
  galleries: GallerySummary[];
  allPosts: PostSummary[];
  initialCategories: Category[];
  initialTags: Tag[];
  ads: { id: number; name: string }[];
  onSaved: () => void;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);
  const router = useRouter();
  const toast = useToast();

  const slug = post?.slug ?? null;
  const [draft, setDraft] = useState<Draft>(() => draftFromPost(post));
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf(draftFromPost(post)));
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const snapshot = useMemo(() => snapshotOf(draft), [draft]);
  const dirty = snapshot !== savedSnapshot;

  async function save() {
    if (saving) return;
    if (!draft.title.trim()) {
      toast.error("Önce yazına bir başlık ver.");
      return;
    }
    const sent = draft;
    setSaving(true);
    setSaveFailed(false);
    try {
      const body = payloadOf(sent);
      const saved = slug
        ? await adminFetch<Post>(`/api/posts/${encodeURIComponent(slug)}/`, { method: "PATCH", json: body })
        : await adminFetch<Post>("/api/posts/", { method: "POST", json: body });

      // Yayınlanınca sunucu tarihi doldurabilir; formu bununla eşitle.
      const publishedAt = toLocalInput(saved.published_at);
      setSavedSnapshot(snapshotOf({ ...sent, publishedAt }));
      setDraft((d) => (d.publishedAt === sent.publishedAt ? { ...d, publishedAt } : d));
      toast.success(
        sent.status === "published" ? "Yazı kaydedildi ve yayında." : "Yazı taslak olarak kaydedildi.",
        sent.status === "published" ? { label: "Sitede gör", onClick: () => window.open(`/yazilar/${encodeURIComponent(saved.slug)}`, "_blank") } : undefined,
      );
      // Sayfa kaydedilen veriyle baştan yüklenir: eski taslak, açık sekmeler ve geçici durum unutulur.
      window.scrollTo({ top: 0 });
      if (!slug) router.replace(`/admin/posts/${encodeURIComponent(saved.slug)}`);
      else onSaved();
    } catch (e) {
      setSaveFailed(true);
      toast.error(`Kaydedilemedi: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  }

  // Ctrl/Cmd + S ile kaydet (efekt her zaman güncel `save`'i çağırsın diye ref üzerinden)
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Kaydedilmemiş değişiklik varken sekmeyi kapatmaya/yenilemeye çalışırsa uyar
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function remove() {
    if (!slug || !confirm("Bu yazı silinsin mi? Bu işlem geri alınamaz.")) return;
    try {
      await adminFetch(`/api/posts/${encodeURIComponent(slug)}/`, { method: "DELETE" });
      toast.success("Yazı silindi.");
      router.replace("/admin/posts");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // Önizleme için (yazarken takılmasın diye ertelenmiş değerlerle)
  const deferred = useDeferredValue(draft);
  const previewBlocks = useMemo(() => toApi(deferred.blocks), [deferred.blocks]);
  const previewLocations = useMemo(() => locations.filter((l) => deferred.locIds.includes(l.id)), [locations, deferred.locIds]);
  const ctx = useMemo(() => ({ galleries: galleries.map((g) => ({ slug: g.slug, title: g.title })), locations, ads }), [galleries, locations, ads]);

  const emptyNewPost = !slug && draft.blocks.length === 0;

  return (
    <div>
      <div className="form-head">
        <Link href="/admin/posts" className="back"><ArrowLeft size={16} aria-hidden /> Yazılar</Link>
        <span className={`state ${saveFailed ? "bad" : ""}`} aria-live="polite">
          {saving ? "Kaydediliyor…" : saveFailed ? "Kaydedilemedi" : dirty ? "Kaydedilmemiş değişiklikler var" : slug ? "Tüm değişiklikler kaydedildi" : ""}
        </span>
        <span className="spacer" />
        <div className="tabs" role="tablist" aria-label="Görünüm">
          <button role="tab" aria-selected={tab === "edit"} className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>Düzenle</button>
          <button role="tab" aria-selected={tab === "preview"} className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Önizleme</button>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
      </div>

      {tab === "preview" ? (
        <div className="preview-frame">
          <div className="preview-label">Önizleme: ziyaretçiler yazıyı yaklaşık böyle görecek</div>
          <PostPreview
            title={deferred.title}
            excerpt={deferred.excerpt}
            coverUrl={deferred.cover?.url ?? null}
            publishedAt={deferred.publishedAt ? new Date(deferred.publishedAt).toISOString() : null}
            blocks={previewBlocks}
            theme={deferred.theme}
            locations={locations}
            postLocations={previewLocations}
            category={categories.find((c) => c.id === deferred.categoryId) ?? null}
            tags={deferred.tagIds.flatMap((id) => tags.filter((t) => t.id === id))}
            info={deferred.info.filter((r) => r.label.trim() && r.value.trim())}
            sources={deferred.sources.filter((s) => s.text.trim())}
            related={deferred.relatedIds.flatMap((id) => allPosts.filter((p) => p.id === id)).map((p) => ({ id: p.id, slug: p.slug, title: p.title, cover_url: p.cover_url }))}
          />
        </div>
      ) : (
        <div className="form-grid">
          <div className="form-main">
            <div className="card stack" data-tour="post-title">
              <label>Başlık *
                <input value={draft.title} onChange={(e) => update({ title: e.target.value })} placeholder="Yazının başlığı" maxLength={200} className="title-input" />
              </label>
              <label>Kısa özet <span className="muted">(yazı listelerinde ve paylaşımlarda görünür)</span>
                <textarea rows={2} maxLength={400} value={draft.excerpt} onChange={(e) => update({ excerpt: e.target.value })} />
              </label>
            </div>

            <div className="card stack" data-tour="post-content">
              <div className="row">
                <h2>İçerik</h2>
                <span className="spacer" />
                {emptyNewPost && (
                  <div className="template-row">
                    <span className="muted small">Şablonla başla:</span>
                    {TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
                      <button key={t.id} type="button" className="btn small" title={t.description} onClick={() => update({ blocks: toEditor(t.blocks), theme: t.theme })}>
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <BlockEditor value={draft.blocks} onChange={(blocks) => update({ blocks })} ctx={ctx} />
            </div>

            <InfoCard value={draft.info} onChange={(info) => update({ info })} />
            <SourcesCard value={draft.sources} onChange={(sources) => update({ sources })} />
            <RelatedCard posts={allPosts} currentId={post?.id ?? null} value={draft.relatedIds} onChange={(relatedIds) => update({ relatedIds })} />
          </div>

          <aside className="form-side" aria-label="Yazı ayarları">
            <div className="card stack" data-tour="post-status">
              <h2>Yayın</h2>
              <label>Durum
                <select value={draft.status} onChange={(e) => update({ status: e.target.value as Status })}>
                  <option value="draft">Taslak (sadece sen görürsün)</option>
                  <option value="published">Yayında (ziyaretçiler görür)</option>
                </select>
              </label>
              <label>Yayın tarihi <span className="muted">(boşsa kaydettiğin an)</span>
                <input type="datetime-local" value={draft.publishedAt} onChange={(e) => update({ publishedAt: e.target.value })} />
              </label>
              <div className="row">
                <button className="btn primary" style={{ flex: 1 }} onClick={save} disabled={saving}>Kaydet</button>
                {slug && post?.status === "published" && (
                  <Link className="btn" href={`/yazilar/${encodeURIComponent(slug)}`} target="_blank">Sitede gör</Link>
                )}
              </div>
            </div>

            <div className="card stack">
              <h2>Kapak fotoğrafı</h2>
              {draft.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb" src={draft.cover.url} alt="" />
              )}
              <div className="row">
                <ImagePicker label={draft.cover ? "Değiştir" : "Kapak seç"} onPick={(img: AdminImage) => update({ cover: { id: img.id, url: img.url } })} />
                {draft.cover && <button type="button" className="btn" onClick={() => update({ cover: null })}>Kaldır</button>}
              </div>
            </div>

            <div data-tour="post-taxonomy" className="stack" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <CategoryCard categories={categories} value={draft.categoryId} onChange={(categoryId) => update({ categoryId })} onCreated={(c) => setCategories((l) => [...l, c].sort((a, b) => a.name.localeCompare(b.name, "tr")))} />
            <TagsCard tags={tags} value={draft.tagIds} onChange={(tagIds) => update({ tagIds })} onCreated={(t) => setTags((l) => [...l, t].sort((a, b) => a.name.localeCompare(b.name, "tr")))} />
            </div>

            <div className="card stack">
              <h2>Konumlar</h2>
              {locations.length === 0 ? (
                <p className="muted small" style={{ margin: 0 }}>Henüz konum yok. <Link href="/admin/locations" target="_blank" style={{ textDecoration: "underline" }}>Konumlar</Link> sayfasından haritaya bir yer ekleyebilirsin.</p>
              ) : (
                <div className="chips">
                  {locations.map((l) => (
                    <label key={l.id} className={`chip ${draft.locIds.includes(l.id) ? "on" : ""}`}>
                      <input type="checkbox" checked={draft.locIds.includes(l.id)} onChange={() => update({ locIds: draft.locIds.includes(l.id) ? draft.locIds.filter((x) => x !== l.id) : [...draft.locIds, l.id] })} />
                      {l.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="card stack">
              <h2>Görünüm</h2>
              <ThemePicker theme={draft.theme} onChange={(theme) => update({ theme })} />
            </div>

            {slug && (
              <div className="card stack">
                <h2>Yazıyı sil</h2>
                <p className="muted small" style={{ margin: 0 }}>Silinen yazı geri getirilemez.</p>
                <div><button type="button" className="btn danger" onClick={remove}>Bu yazıyı sil</button></div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export function PostEditor({ slug }: { slug?: string }) {
  const post = useApi<Post>(slug ? `/api/posts/${encodeURIComponent(slug)}/` : null);
  const locs = useApi<Location[]>("/api/locations/");
  const gals = useApi<GallerySummary[]>("/api/galleries/");
  const all = useApi<PostSummary[]>("/api/posts/");
  const cats = useApi<Category[]>("/api/categories/");
  const tgs = useApi<Tag[]>("/api/tags/");
  const adList = useApi<Ad[]>("/api/ads/");

  const error = post.error ?? locs.error ?? gals.error ?? all.error ?? cats.error ?? tgs.error ?? adList.error;
  if (error) return <p className="admin-error">{error.message}</p>;
  if ((slug && !post.data) || !locs.data || !gals.data || !all.data || !cats.data || !tgs.data || !adList.data) return <p className="muted">Yükleniyor…</p>;
  // key: farklı yazıya geçildiğinde form durumu sıfırlansın
  return <PostForm key={`${slug ?? "new"}:${post.data?.updated_at ?? ""}`} onSaved={post.reload} post={post.data ?? null} locations={locs.data} galleries={gals.data} allPosts={all.data} initialCategories={cats.data} initialTags={tgs.data} ads={adList.data.map((a) => ({ id: a.id, name: a.name }))} />;
}
