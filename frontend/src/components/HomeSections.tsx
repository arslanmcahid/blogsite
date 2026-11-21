import Link from "next/link";
import { getGalleries, getHome, getLocations, getPosts } from "@/lib/api";
import type { HomeSection } from "@/lib/types";
import { AdSlot } from "./AdSlot";
import { MapView } from "./MapView";
import { Markdown } from "./Markdown";
import { PostCard } from "./PostCard";

/** Elle seçilmiş yazılar varsa onlar (sırayla), yoksa en yeniler. */
async function pickPosts(section: HomeSection, count: number, exclude?: string) {
  const all = await getPosts();
  if (section.items) return section.items.flatMap((slug) => all.filter((p) => p.slug === slug));
  return all.filter((p) => p.slug !== exclude).slice(0, count);
}

async function Section({ section, featuredSlug }: { section: HomeSection; featuredSlug?: string }) {
  switch (section.type) {
    case "featured_post": {
      const [post] = await pickPosts(section, 1);
      if (!post) return null;
      return (
        <section>
          {section.title && <h2>{section.title}</h2>}
          <PostCard post={post} featured />
        </section>
      );
    }
    case "latest_posts": {
      const posts = await pickPosts(section, section.limit ?? 6, featuredSlug);
      if (posts.length === 0) return null;
      return (
        <section>
          <h2>{section.title ?? "Son yazılar"}</h2>
          <div className="card-grid">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      );
    }
    case "gallery_showcase": {
      const all = await getGalleries();
      const galleries = section.items ? section.items.flatMap((slug) => all.filter((g) => g.slug === slug)) : all.slice(0, section.limit ?? 4);
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
    case "ad":
      return <AdSlot placement="home" />;
    case "text":
      return section.markdown ? <section><Markdown>{section.markdown}</Markdown></section> : null;
    default:
      return null;
  }
}

export async function HomeSections() {
  const { sections } = await getHome();
  // "Öne çıkan" yazı, "Son yazılar" listesinde tekrar gösterilmesin.
  const featuredSection = sections.find((s) => s.type === "featured_post");
  const [featured] = featuredSection ? await pickPosts(featuredSection, 1) : [];
  return (
    <>
      {sections.map((s, i) => <Section key={i} section={s} featuredSlug={featured?.slug} />)}
    </>
  );
}
