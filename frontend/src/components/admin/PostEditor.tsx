"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, errorMessage, useApi } from "@/lib/admin-api";
import { type EBlock, TEMPLATES, toApi, toEditor } from "@/lib/editor-model";
import type { AdminImage, GallerySummary, Location, Post, PostTheme } from "@/lib/types";
import { BlockEditor } from "./BlockEditor";
import { ImagePicker } from "./ImagePicker";
import { PostPreview } from "./PostPreview";
import { ThemePicker } from "./ThemePicker";
import { useToast } from "./Toast";

type Status = "draft" | "published";
type Cover = { id: number; url: string } | null;
type ViewMode = "edit" | "preview" | "split";

type Draft = {
  title: string;
  excerpt: string;
  cover: Cover;
  blocks: EBlock[];
  theme: PostTheme;
  locIds: number[];
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
    cover: post?.cover_url && post.cover ? { id: post.cover, url: post.cover_url } : null,
    blocks: toEditor(post?.blocks ?? []),
    theme: post?.theme ?? {},
    locIds: post?.location_details.map((l) => l.id) ?? [],
    publishedAt: toLocalInput(post?.published_at ?? null),
  };
}

/** Sunucuya gidecek veri (kimlikler ve boş bölümler ayıklanmış). */
function payloadOf(d: Draft) {
  return {
    title: d.title.trim(),
    excerpt: d.excerpt,
    cover: d.cover?.id ?? null,
    blocks: toApi(d.blocks),
    theme: d.theme,
    locations: d.locIds,
    published_at: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
  };
}

const snapshotOf = (d: Draft) => JSON.stringify(payloadOf(d));

// --- Tarayıcıda yerel yedek (kayıt başarısız olursa ya da sekme kapanırsa kurtarmak için) ---
const backupKey = (slug: string | null) => `blog-admin:backup:${slug ?? "new"}`;
type Backup = { draft: Draft; at: number };

function readBackup(slug: string | null): Backup | null {
  try {
    const raw = localStorage.getItem(backupKey(slug));
    return raw ? (JSON.parse(raw) as Backup) : null;
  } catch {
    return null;
  }
}
function writeBackup(slug: string | null, draft: Draft) {
  try {
    localStorage.setItem(backupKey(slug), JSON.stringify({ draft, at: Date.now() } satisfies Backup));
  } catch {
    /* özel pencere / dolu depolama: yedek opsiyonel */
  }
}
function clearBackup(slug: string | null) {
  try {
    localStorage.removeItem(backupKey(slug));
  } catch {
    /* yoksay */
  }
}

const timeLabel = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

function PostForm({ post, locations, galleries }: { post: Post | null; locations: Location[]; galleries: GallerySummary[] }) {
  const router = useRouter();
  const toast = useToast();

  const [slug, setSlug] = useState<string | null>(post?.slug ?? null);
  const [status, setStatus] = useState<Status>(post?.status ?? "draft");
  const [draft, setDraft] = useState<Draft>(() => draftFromPost(post));
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf(draftFromPost(post)));
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(post ? new Date(post.updated_at) : null);
  const [view, setView] = useState<ViewMode>("edit");
  const [templateChosen, setTemplateChosen] = useState(false);
  const [backup, setBackup] = useState<Backup | null>(() => {
    const b = readBackup(post?.slug ?? null);
    return b && snapshotOf(b.draft) !== snapshotOf(draftFromPost(post)) && (!post || b.at > new Date(post.updated_at).getTime()) ? b : null;
  });

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const snapshot = useMemo(() => snapshotOf(draft), [draft]);
  const dirty = snapshot !== savedSnapshot;

  async function save(opts: { status?: Status; silent?: boolean } = {}) {
    if (saving) return;
    if (!draft.title.trim()) {
      if (!opts.silent) toast.error("Önce yazına bir başlık ver.");
      return;
    }
    const sent = draft;
    const nextStatus = opts.status ?? status;
    setSaving(true);
    setSaveFailed(false);
    try {
      const body = { ...payloadOf(sent), status: nextStatus };
      const saved = slug
        ? await adminFetch<Post>(`/api/posts/${encodeURIComponent(slug)}/`, { method: "PATCH", json: body })
        : await adminFetch<Post>("/api/posts/", { method: "POST", json: body });

      const publishedAt = toLocalInput(saved.published_at);
      setStatus(saved.status);
      setSavedSnapshot(snapshotOf({ ...sent, publishedAt }));
      setDraft((d) => (d.publishedAt === sent.publishedAt ? { ...d, publishedAt } : d));
      setLastSaved(new Date());
      clearBackup(slug);
      if (!slug) {
        setSlug(saved.slug);
        // Sayfayı yeniden yüklemeden adresi güncelle (yazarken odak kaybolmasın)
        window.history.replaceState(null, "", `/admin/posts/${encodeURIComponent(saved.slug)}`);
      }
      if (!opts.silent) {
        if (opts.status === "published") {
          toast.success("Yazın yayında!", { label: "Sitede gör", onClick: () => window.open(`/yazilar/${encodeURIComponent(saved.slug)}`, "_blank") });
        } else if (opts.status === "draft") {
          toast.success("Yazı taslağa alındı, artık sitede görünmüyor.");
        } else {
          toast.success("Kaydedildi.");
        }
      }
    } catch (e) {
      setSaveFailed(true);
      writeBackup(slug, sent);
      toast.error(`Kaydedilemedi: ${errorMessage(e)} (Yazın bu tarayıcıda yedeklendi.)`);
    } finally {
      setSaving(false);
    }
  }

  // Efektlerin güncel `save` fonksiyonunu çağırabilmesi için
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  // Otomatik kaydetme: yalnızca taslaklar için. Yayındaki yazı, sen "Güncelle"ye basana kadar değişmez.
  useEffect(() => {
    if (!dirty || status !== "draft" || saving || saveFailed) return;
    if (!slug && !draft.title.trim()) return;
    const t = setTimeout(() => saveRef.current({ silent: true }), 2500);
    return () => clearTimeout(t);
  }, [snapshot, dirty, status, saving, saveFailed, slug, draft.title]);

  // Yerel yedek: kaydedilmemiş değişiklikler tarayıcıya da yazılır
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => writeBackup(slug, draft), 700);
    return () => clearTimeout(t);
  }, [snapshot, dirty, slug, draft]);

  // Kaydedilmemiş değişiklik varken sekmeyi kapatmaya/yenilemeye çalışırsa uyar
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Ctrl/Cmd + S
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

  async function remove() {
    if (!slug || !confirm("Bu yazı silinsin mi? Bu işlem geri alınamaz.")) return;
    try {
      await adminFetch(`/api/posts/${encodeURIComponent(slug)}/`, { method: "DELETE" });
      clearBackup(slug);
      toast.success("Yazı silindi.");
      router.replace("/admin");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  // Önizleme için (yazarken takılmasın diye ertelenmiş değerlerle)
  const deferred = useDeferredValue(draft);
  const previewBlocks = useMemo(() => toApi(deferred.blocks), [deferred.blocks]);
  const previewLocations = useMemo(() => locations.filter((l) => deferred.locIds.includes(l.id)), [locations, deferred.locIds]);
  const ctx = useMemo(() => ({ galleries: galleries.map((g) => ({ slug: g.slug, title: g.title })), locations }), [galleries, locations]);

  const showTemplates = !slug && !templateChosen && draft.blocks.length === 0;
  const statusText = saving
    ? "Kaydediliyor…"
    : saveFailed
      ? "⚠ Kaydedilemedi"
      : dirty
        ? status === "draft"
          ? draft.title.trim() ? "Birazdan otomatik kaydedilecek…" : "Başlık yazınca otomatik kaydedilir"
          : "Kaydedilmemiş değişiklikler var"
        : lastSaved
          ? `✓ Kaydedildi ${timeLabel(lastSaved)}`
          : "";

  const editor = (
    <div className="write">
      {backup && (
        <div className="notice">
          <span>Bu yazı için kaydedilmemiş bir sürüm bulundu ({timeLabel(new Date(backup.at))}).</span>
          <button className="btn small primary" onClick={() => { setDraft(backup.draft); setBackup(null); setTemplateChosen(true); }}>Geri yükle</button>
          <button className="btn small" onClick={() => { clearBackup(slug); setBackup(null); }}>Yoksay</button>
        </div>
      )}
      <input
        className="title-input"
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Yazının başlığı…"
        aria-label="Yazının başlığı"
        maxLength={200}
      />
      {showTemplates ? (
        <section aria-label="Şablon seç">
          <h2 className="tpl-title">Nasıl başlamak istersin?</h2>
          <p className="muted small">Bir şablon seç; sonradan her şeyi değiştirebilirsin.</p>
          <div className="templates">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className="template" onClick={() => { update({ blocks: toEditor(t.blocks), theme: t.theme }); setTemplateChosen(true); }}>
                <span className="emoji" aria-hidden>{t.emoji}</span>
                <strong>{t.title}</strong>
                <span className="hint">{t.description}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <BlockEditor value={draft.blocks} onChange={(blocks) => update({ blocks })} ctx={ctx} />
      )}
    </div>
  );

  const preview = (
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
      />
    </div>
  );

  const settings = (
    <aside className="settings" aria-label="Yazı ayarları">
      <details open className="setting">
        <summary>Yayın</summary>
        <div className="stack">
          <p className="small">
            Durum: <span className={`badge ${status}`}>{status === "published" ? "Yayında" : "Taslak"}</span>
          </p>
          <label>Hangi tarihte yayınlansın? <span className="muted">(boşsa yayınladığın an)</span>
            <input type="datetime-local" value={draft.publishedAt} onChange={(e) => update({ publishedAt: e.target.value })} />
          </label>
          {status === "draft" && <p className="muted small">Taslaklar yalnızca sende görünür ve otomatik kaydedilir.</p>}
          {status === "published" && <p className="muted small">Yayındaki yazıda yaptığın değişiklikler “Güncelle”ye basana kadar sitede görünmez.</p>}
        </div>
      </details>
      <details open className="setting">
        <summary>Kapak fotoğrafı</summary>
        <div className="stack">
          {draft.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumb" src={draft.cover.url} alt="" />
          )}
          <div className="row">
            <ImagePicker label={draft.cover ? "Değiştir" : "Kapak seç"} onPick={(img: AdminImage) => update({ cover: { id: img.id, url: img.url } })} />
            {draft.cover && <button type="button" className="btn" onClick={() => update({ cover: null })}>Kaldır</button>}
          </div>
        </div>
      </details>
      <details open className="setting">
        <summary>Kısa özet</summary>
        <label className="sr-only" htmlFor="excerpt">Kısa özet</label>
        <textarea id="excerpt" rows={3} maxLength={400} value={draft.excerpt} onChange={(e) => update({ excerpt: e.target.value })} placeholder="Yazı listelerinde ve paylaşımlarda görünen bir iki cümle" />
        <span className="muted small">{draft.excerpt.length}/400</span>
      </details>
      <details className="setting">
        <summary>Görünüm</summary>
        <ThemePicker theme={draft.theme} onChange={(theme) => update({ theme })} />
      </details>
      <details className="setting">
        <summary>Konum etiketleri</summary>
        {locations.length === 0 ? (
          <p className="muted small">Henüz konum yok. <Link href="/admin/locations" target="_blank">Konumlar</Link> sayfasından haritaya bir yer ekleyebilirsin.</p>
        ) : (
          <div className="chips">
            {locations.map((l) => (
              <label key={l.id} className={`chip ${draft.locIds.includes(l.id) ? "on" : ""}`}>
                <input type="checkbox" checked={draft.locIds.includes(l.id)} onChange={() => update({ locIds: draft.locIds.includes(l.id) ? draft.locIds.filter((x) => x !== l.id) : [...draft.locIds, l.id] })} />
                📍 {l.name}
              </label>
            ))}
          </div>
        )}
      </details>
      {slug && (
        <details className="setting danger-zone">
          <summary>Yazıyı sil</summary>
          <p className="muted small">Silinen yazı geri getirilemez.</p>
          <button type="button" className="btn danger" onClick={remove}>Bu yazıyı sil</button>
        </details>
      )}
    </aside>
  );

  return (
    <div className="editor-page">
      <div className="editor-bar">
        <Link href="/admin" className="back">← Yazılar</Link>
        <span className={`save-state ${saveFailed ? "bad" : ""}`} aria-live="polite">{statusText}</span>
        <span className="spacer" />
        <div className="segmented" role="group" aria-label="Görünüm">
          {([["edit", "Yaz"], ["split", "Yan yana"], ["preview", "Önizle"]] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{label}</button>
          ))}
        </div>
        {status === "published" ? (
          <>
            {slug && <Link className="btn" href={`/yazilar/${encodeURIComponent(slug)}`} target="_blank">Sitede gör ↗</Link>}
            <button className="btn" onClick={() => save({ status: "draft" })} disabled={saving}>Yayından kaldır</button>
            <button className="btn primary" onClick={() => save()} disabled={saving || !dirty}>Güncelle</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={() => save()} disabled={saving || (!dirty && !!slug)}>Taslağı kaydet</button>
            <button className="btn primary" onClick={() => save({ status: "published" })} disabled={saving}>Yayınla</button>
          </>
        )}
      </div>

      <div className={`editor-layout mode-${view}`}>
        {view !== "preview" && <div className="editor-col">{editor}</div>}
        {view !== "edit" && <div className="preview-col">{preview}</div>}
        {view === "edit" && settings}
      </div>
      {view === "split" && <p className="muted small hint-split">Yan yana görünümde ayarlar gizlidir. Kapak, görünüm ve konum için “Yaz” görünümüne dön.</p>}
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
