import type { Metadata } from "next";
import { Suspense } from "react";
import { AdSlot } from "@/components/AdSlot";
import { BlockRenderer } from "@/components/BlockRenderer";
import { MapView } from "@/components/MapView";
import { SideRails } from "@/components/SideRails";
import { InfoCardView, PostMeta, RelatedView, SourcesView } from "@/components/PostParts";
import { getPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { decodeSlug } from "@/lib/slug";

export async function generateMetadata({ params }: PageProps<"/yazilar/[slug]">): Promise<Metadata> {
  const post = await getPost(decodeSlug((await params).slug));
  const path = `/yazilar/${encodeURIComponent(post.slug)}`;
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt || undefined,
      url: path,
      publishedTime: post.published_at ?? undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
    twitter: { card: post.cover_url ? "summary_large_image" : "summary" },
  };
}

export default async function PostPage({ params }: PageProps<"/yazilar/[slug]">) {
  const post = await getPost(decodeSlug((await params).slug));
  const { font = "serif", width = "normal", accent } = post.theme ?? {};

  // Arama motorları için yapılandırılmış veri (schema.org BlogPosting).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.published_at ?? undefined,
    image: post.cover_url ? `${SITE_URL}${post.cover_url}` : undefined,
    mainEntityOfPage: `${SITE_URL}/yazilar/${encodeURIComponent(post.slug)}`,
    keywords: post.tag_details.length ? post.tag_details.map((t) => t.name).join(", ") : undefined,
    articleSection: post.category_detail?.name,
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <main id="main" className="container">
      <Suspense fallback={null}><SideRails kind="post" /></Suspense>
      <article
        className={`post font-${font} width-${width}`}
        style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}
      >
        <script
          type="application/ld+json"
          // "<" kaçırılır ki içerikteki "</script>" etiketi betiği bozamasın.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <header>
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="lead">{post.excerpt}</p>}
          <PostMeta category={post.category_detail} tags={post.tag_details} />
        </header>
        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="post-cover" src={post.cover_url} alt="" />
        )}
        <InfoCardView rows={post.info} />
        <BlockRenderer blocks={post.blocks} />
        <AdSlot placement="post_end" />
        <SourcesView sources={post.sources} />
        <RelatedView posts={post.related_details} />
        {post.location_details.length > 0 && (
          <footer className="post-locations">
            <h2>Konumlar</h2>
            <MapView locations={post.location_details} />
          </footer>
        )}
      </article>
    </main>
  );
}
