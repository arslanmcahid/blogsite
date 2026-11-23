import Link from "next/link";
import type { Category, InfoRow, RelatedPost, Source, Tag } from "@/lib/types";

/** Kategori ve etiket çipleri; her biri o filtreyle yazı listesine gider. */
export function PostMeta({
  category,
  tags,
  newTab = false,
}: {
  category: Category | null;
  tags: Tag[];
  newTab?: boolean;
}) {
  if (!category && tags.length === 0) return null;
  const t = newTab ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <p className="post-meta">
      {category && (
        <Link
          className="cat"
          href={`/yazilar?kategori=${encodeURIComponent(category.slug)}`}
          {...t}
        >
          {category.name}
        </Link>
      )}
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={`/yazilar?etiket=${encodeURIComponent(tag.slug)}`}
          {...t}
        >
          #{tag.name}
        </Link>
      ))}
    </p>
  );
}

export function InfoCardView({ rows }: { rows: InfoRow[] }) {
  if (rows.length === 0) return null;
  return (
    <aside className="info-card" aria-label="Bilgi kartı">
      <h2>Bilgi kartı</h2>
      <dl>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "contents" }}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function SourcesView({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <section className="post-sources">
      <h2>Kaynakça</h2>
      <ol>
        {sources.map((s, i) => (
          <li key={i}>
            {s.text}
            {s.url && (
              <>
                {" "}
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.url}
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RelatedView({
  posts,
  newTab = false,
}: {
  posts: RelatedPost[];
  newTab?: boolean;
}) {
  if (posts.length === 0) return null;
  const t = newTab ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <section className="post-related">
      <h2>Bunları da oku</h2>
      <ul>
        {posts.map((p) => (
          <li key={p.id}>
            <Link href={`/yazilar/${encodeURIComponent(p.slug)}`} {...t}>
              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_url} alt="" loading="lazy" />
              )}
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
