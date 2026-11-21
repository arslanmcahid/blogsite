import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostCard } from "@/components/PostCard";
import { getCategories, getPosts, getTags } from "@/lib/api";

export const metadata: Metadata = { title: "Yazılar" };

type Search = { kategori?: string; etiket?: string };

async function List({ searchParams }: { searchParams: Promise<Search> }) {
  const { kategori, etiket } = await searchParams;
  const [posts, categories, tags] = await Promise.all([
    getPosts({ category: kategori, tag: etiket }),
    getCategories(),
    getTags(),
  ]);
  const activeCat = categories.find((c) => c.slug === kategori);
  const activeTag = tags.find((t) => t.slug === etiket);
  return (
    <>
      {categories.length > 0 && (
        <p className="post-meta" aria-label="Kategoriler">
          <Link className={kategori ? undefined : "cat"} href="/yazilar">Tümü</Link>
          {categories.map((c) => (
            <Link key={c.id} className={c.slug === kategori ? "cat" : undefined} href={`/yazilar?kategori=${encodeURIComponent(c.slug)}`}>{c.name}</Link>
          ))}
        </p>
      )}
      {(activeTag || (etiket && !activeTag)) && (
        <p className="filter-note">
          <span>Etiket: <strong>#{activeTag?.name ?? etiket}</strong></span>
          <Link href={activeCat ? `/yazilar?kategori=${encodeURIComponent(activeCat.slug)}` : "/yazilar"}>Filtreyi kaldır</Link>
        </p>
      )}
      {posts.length === 0 ? (
        <p className="muted">{kategori || etiket ? "Bu filtreyle eşleşen yazı yok." : "Henüz yazı yok."}</p>
      ) : (
        <div className="card-grid">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
      )}
    </>
  );
}

export default function PostsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <main id="main" className="container">
      <h1>Yazılar</h1>
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}><List searchParams={searchParams} /></Suspense>
    </main>
  );
}
