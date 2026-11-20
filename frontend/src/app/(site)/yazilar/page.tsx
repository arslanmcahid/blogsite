import type { Metadata } from "next";
import { Suspense } from "react";
import { PostCard } from "@/components/PostCard";
import { getPosts } from "@/lib/api";

export const metadata: Metadata = { title: "Yazılar" };

async function List() {
  const posts = await getPosts();
  if (posts.length === 0) return <p className="muted">Henüz yazı yok.</p>;
  return <div className="card-grid">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}

export default function PostsPage() {
  return (
    <main className="container">
      <h1>Yazılar</h1>
      <Suspense fallback={<p className="muted">Yükleniyor…</p>}><List /></Suspense>
    </main>
  );
}
