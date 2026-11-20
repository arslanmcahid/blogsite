import type { GalleryItem } from "@/lib/types";

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  return (
    <div className="gallery-grid">
      {items.map((item) => (
        <figure key={item.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.caption} width={item.width ?? undefined} height={item.height ?? undefined} loading="lazy" />
          {item.caption && <figcaption>{item.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}
