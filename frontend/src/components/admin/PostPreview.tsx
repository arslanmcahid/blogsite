"use client";

import { useMemo } from "react";
import { useApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { Block, Category, Gallery, InfoRow, InnerBlock, Location, PostTheme, RelatedPost, Source, Tag } from "@/lib/types";
import { MapView } from "../MapView";
import { Markdown } from "../Markdown";
import { InfoCardView, PostMeta, RelatedView, SourcesView } from "../PostParts";
import { VideoEmbed } from "../VideoEmbed";

function PreviewMap({ id, locations }: { id: number; locations: Location[] }) {
  const selected = useMemo(() => locations.filter((l) => l.id === id), [locations, id]);
  if (selected.length === 0) return <p className="muted small">Harita için bir konum seç.</p>;
  return <MapView locations={selected} height={240} />;
}

function PreviewGallery({ slug }: { slug: string }) {
  const { data, error } = useApi<Gallery>(`/api/galleries/${encodeURIComponent(slug)}/`);
  if (error) return <p className="muted small">“{slug}” sergisi bulunamadı veya yayında değil.</p>;
  if (!data) return <p className="muted small">Sergi yükleniyor…</p>;
  return (
    <section className="block-gallery">
      <h3>{data.title}</h3>
      <div className="gallery-grid">
        {data.items.map((it) => (
          <figure key={it.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt={it.caption} />
            {it.caption && <figcaption>{it.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}

function Item({ block, locations }: { block: InnerBlock; locations: Location[] }) {
  switch (block.type) {
    case "text":
      return <Markdown>{block.markdown}</Markdown>;
    case "image":
      return (
        <figure className="block-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt ?? ""} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case "quote":
      return (
        <blockquote className="block-quote">
          <p>{block.text}</p>
          {block.author && <footer>— {block.author}</footer>}
        </blockquote>
      );
    case "gallery":
      return <PreviewGallery slug={block.gallery} />;
    case "video":
      return <VideoEmbed url={block.url} />;
    case "ad":
      return <p className="ad-ph">Reklam alanı (reklam burada görünür)</p>;
    case "map":
      return <PreviewMap id={block.location} locations={locations} />;
  }
}

/** Yazının sitede görüneceği hâlin kabaca aynısı (aynı CSS sınıfları kullanılır). */
export function PostPreview({
  title, excerpt, coverUrl, publishedAt, blocks, theme, locations, postLocations, category, tags, info, sources, related,
}: {
  title: string;
  excerpt: string;
  coverUrl: string | null;
  publishedAt: string | null;
  blocks: Block[];
  theme: PostTheme;
  locations: Location[];
  postLocations: Location[];
  category: Category | null;
  tags: Tag[];
  info: InfoRow[];
  sources: Source[];
  related: RelatedPost[];
}) {
  const { font = "serif", width = "normal", accent } = theme;
  return (
    <article className={`post font-${font} width-${width}`} style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}>
      <header>
        <time>{publishedAt ? formatDate(publishedAt) : "Yayın tarihi henüz yok"}</time>
        <h1>{title || "Başlıksız yazı"}</h1>
        {excerpt && <p className="lead">{excerpt}</p>}
        <PostMeta category={category} tags={tags} newTab />
      </header>
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="post-cover" src={coverUrl} alt="" />
      )}
      <InfoCardView rows={info} />
      <div className="blocks">
        {blocks.length === 0 && <p className="muted">Yazına bölüm eklediğinde burada görünecek.</p>}
        {blocks.map((b, i) =>
          b.type === "columns" ? (
            <div key={i} className="block-columns" style={{ "--cols": b.columns.length } as React.CSSProperties}>
              {b.columns.map((col, ci) => (
                <div key={ci} className="column">
                  {col.map((inner, bi) => <Item key={bi} block={inner} locations={locations} />)}
                </div>
              ))}
            </div>
          ) : (
            <Item key={i} block={b} locations={locations} />
          ),
        )}
      </div>
      <p className="ad-ph">Yazı sonu reklam alanı</p>
      <SourcesView sources={sources} />
      <RelatedView posts={related} newTab />
      {postLocations.length > 0 && (
        <footer className="post-locations">
          <h2>Konumlar</h2>
          <MapView locations={postLocations} height={240} />
        </footer>
      )}
    </article>
  );
}
