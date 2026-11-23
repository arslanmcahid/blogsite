import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/types";

export function PostCard({
  post,
  featured = false,
}: {
  post: PostSummary;
  featured?: boolean;
}) {
  return (
    <article className={featured ? "card card-featured" : "card"}>
      {post.cover_url && (
        <Link href={`/yazilar/${post.slug}`} className="card-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_url}
            alt=""
            loading={featured ? "eager" : "lazy"}
          />
        </Link>
      )}
      <div className="card-body">
        <time dateTime={post.published_at ?? undefined}>
          {formatDate(post.published_at)}
        </time>
        <h3>
          <Link href={`/yazilar/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.excerpt && <p>{post.excerpt}</p>}
        {(post.category_detail || post.tag_details.length > 0) && (
          <p className="tags">
            {post.category_detail && (
              <strong>{post.category_detail.name}</strong>
            )}
            {post.category_detail && post.tag_details.length > 0 && " · "}
            {post.tag_details.map((t) => `#${t.name}`).join(" ")}
          </p>
        )}
        {post.location_details.length > 0 && (
          <p className="tags">
            📍 {post.location_details.map((l) => l.name).join(", ")}
          </p>
        )}
      </div>
    </article>
  );
}
