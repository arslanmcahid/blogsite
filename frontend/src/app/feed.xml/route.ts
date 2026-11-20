import { connection } from "next/server";
import { getPosts } from "@/lib/api";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// RSS 2.0 akışı: okuyucuların (Feedly vb.) blogu takip edebilmesi için.
export async function GET() {
  await connection();
  const posts = (await getPosts()).slice(0, 30);
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/yazilar/${encodeURIComponent(p.slug)}`;
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>${
        p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""
      }${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}</item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(SITE_NAME)}</title><link>${SITE_URL}</link><description>${esc(SITE_DESCRIPTION)}</description><language>tr</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
