import Link from "next/link";
import { getGalleries, getHome, getLocations, getPosts } from "@/lib/api";
import type { HomeSection } from "@/lib/types";
import { MapView } from "./MapView";
import { Markdown } from "./Markdown";
import { PostCard } from "./PostCard";

async function Section({ section, featuredSlug }: { section: HomeSection; featuredSlug?: string }) {
  switch (section.type) {
    case "featured_post": {
      const [post] = await getPosts();
      if (!post) return null;
      return (
        <section>
          {section.title && <h2>{section.title}</h2>}
          <PostCard post={post} featured />
        </section>
      );
    }
    case "latest_posts": {
      const posts = (await getPosts()).filter((p) => p.slug !== featuredSlug).slice(0, section.limit ?? 6);
      if (posts.length === 0) return null;
      return (
        <section>
          <h2>{section.title ?? "Son yazılar"}</h2>
          <div className="card-grid">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      );
    }
    case "gallery_showcase": {
      const galleries = (await getGalleries()).slice(0, section.limit ?? 4);
      if (galleries.length === 0) return null;
      return (
        <section>
          <h2>{section.title ?? "Sergiler"}</h2>
          <div className="card-grid">
            {galleries.map((g) => (
              <article key={g.id} className="card">
                {g.cover_url && (
                  <Link href={`/galeri/${g.slug}`} className="card-cover">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.cover_url} alt="" loading="lazy" />
                  </Link>
                )}
                <div className="card-body"><h3><Link href={`/galeri/${g.slug}`}>{g.title}</Link></h3></div>
              </article>
            ))}
          </div>
        </section>
      );
    }
    case "map": {
      const locations = await getLocations();
      if (locations.length === 0) return null;
      return (
        <section>
          <h2>{section.title ?? "Gittiğim yerler"}</h2>
          <MapView locations={locations} />
        </section>
      );
    }
    case "text":
      return section.markdown ? <section><Markdown>{section.markdown}</Markdown></section> : null;
    default:
      return null;
  }
}

export async function HomeSections() {
  const { sections } = await getHome();
  // "Öne çıkan" yazı, "Son yazılar" listesinde tekrar gösterilmesin.
  const [featured] = sections.some((s) => s.type === "featured_post") ? await getPosts() : [];
  return (
    <>
      {sections.map((s, i) => <Section key={i} section={s} featuredSlug={featured?.slug} />)}
    </>
  );
}
