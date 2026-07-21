import { getCuratedPosts } from "@/lib/posts";
import { listBlogPosts } from "@/lib/blog";
import { markdownExcerpt } from "@/lib/markdown";

const SITE_URL = "https://gitnewstars.vercel.app";
const FEED_LIMIT = 20;

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function excerpt(body: string, max = 280): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function rfc822(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

export async function GET() {
  const [snapshot, blogPosts] = await Promise.all([
    getCuratedPosts(),
    listBlogPosts(),
  ]);
  const posts = [...snapshot.posts]
    .sort((a, b) => {
      const aAt = a.curatedAt || a.createdAt;
      const bAt = b.curatedAt || b.createdAt;
      return bAt.localeCompare(aAt);
    })
    .slice(0, FEED_LIMIT);

  // Merge blog articles and curated posts into one entry list, newest first.
  type Entry = { title: string; link: string; desc: string; pub: string; src?: { url: string; name: string } };
  const entries: Entry[] = [
    ...blogPosts.map((p) => ({
      title: p.title,
      link: `${SITE_URL}/blog/${p.slug}`,
      desc: markdownExcerpt(p.body, 280),
      pub: p.createdAt,
    })),
    ...posts.map((p) => ({
      title: p.title,
      link: `${SITE_URL}/posts/${p.id}`,
      desc: excerpt(p.body),
      pub: p.curatedAt || p.createdAt,
      src: { url: p.sourceUrl, name: p.sourceName },
    })),
  ]
    .sort((a, b) => b.pub.localeCompare(a.pub))
    .slice(0, FEED_LIMIT);

  const lastBuild = entries[0]?.pub || new Date().toISOString();

  const items = entries
    .map(
      (e) => `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${escapeXml(e.link)}</link>
      <guid isPermaLink="true">${escapeXml(e.link)}</guid>
      <description>${escapeXml(e.desc)}</description>
      <pubDate>${rfc822(e.pub)}</pubDate>${
        e.src
          ? `\n      <source url="${escapeXml(e.src.url)}">${escapeXml(e.src.name)}</source>`
          : ""
      }
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GitNewStars — 한국어 AI 코딩 브리핑</title>
    <link>${SITE_URL}</link>
    <description>큐레이션된 AI 코딩 소식과 활용 팁</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
