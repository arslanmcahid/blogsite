import type { Metadata } from "next";
import { Suspense } from "react";
import { BlockRenderer } from "@/components/BlockRenderer";
import { MapView } from "@/components/MapView";
import { getPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { decodeSlug } from "@/lib/slug";

export async function generateMetadata({ params }: PageProps<"/yazilar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(decodeSlug(slug));
  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: { title: post.title, description: post.excerpt || undefined, images: post.cover_url ? [post.cover_url] : undefined },
  };
}

async function PostContent({ slug }: { slug: string }) {
  const post = await getPost(slug);
  const { font = "serif", width = "normal", accent } = post.theme ?? {};
  return (
    <article
      className={`post font-${font} width-${width}`}
      style={accent ? ({ "--accent": accent } as React.CSSProperties) : undefined}
    >
      <header>
        <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="lead">{post.excerpt}</p>}
      </header>
      {post.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="post-cover" src={post.cover_url} alt="" />
      )}
      <BlockRenderer blocks={post.blocks} />
      {post.location_details.length > 0 && (
        <footer className="post-locations">
          <h2>Konumlar</h2>
          <MapView locations={post.location_details} />
        </footer>
      )}
    </article>
  );
}

export default function PostPage({ params }: PageProps<"/yazilar/[slug]">) {
  return (
    <main className="container">
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}>
        <PostRoute params={params} />
      </Suspense>
    </main>
  );
}

async function PostRoute({ params }: { params: PageProps<"/yazilar/[slug]">["params"] }) {
  const { slug } = await params;
  return <PostContent slug={decodeSlug(slug)} />;
}
