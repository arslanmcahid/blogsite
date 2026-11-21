import Link from "next/link";
import { getGalleryOrNull, getLocations } from "@/lib/api";
import type { Block, InnerBlock } from "@/lib/types";
import { AdSlot } from "./AdSlot";
import { GalleryGrid } from "./GalleryGrid";
import { MapView } from "./MapView";
import { VideoEmbed } from "./VideoEmbed";
import { Markdown } from "./Markdown";

async function BlockItem({ block }: { block: InnerBlock }) {
  switch (block.type) {
    case "text":
      return <Markdown>{block.markdown}</Markdown>;
    case "image":
      return (
        <figure className="block-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt ?? ""} loading="lazy" />
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
    case "gallery": {
      const gallery = await getGalleryOrNull(block.gallery);
      if (!gallery) return null; // silinmiş/yayında olmayan galeri: sessizce atla
      return (
        <section className="block-gallery">
          <h3><Link href={`/galeri/${gallery.slug}`}>{gallery.title}</Link></h3>
          <GalleryGrid items={gallery.items} />
        </section>
      );
    }
    case "video":
      return <VideoEmbed url={block.url} />;
    case "ad":
      return <AdSlot placement="post_inline" />;
    case "map": {
      const locations = (await getLocations()).filter((l) => l.id === block.location);
      return <MapView locations={locations} />;
    }
    default:
      return null; // bilinmeyen blok türü sayfayı bozmasın
  }
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blocks">
      {blocks.map((block, i) =>
        block.type === "columns" ? (
          // Gazete düzeni: kolonlar yan yana, dar ekranda alt alta.
          <div key={i} className="block-columns" style={{ "--cols": block.columns.length } as React.CSSProperties}>
            {block.columns.map((col, ci) => (
              <div key={ci} className="column">
                {col.map((inner, bi) => <BlockItem key={bi} block={inner} />)}
              </div>
            ))}
          </div>
        ) : (
          <BlockItem key={i} block={block} />
        ),
      )}
    </div>
  );
}
