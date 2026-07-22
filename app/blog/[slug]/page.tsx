import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, listBundledBlogSlugs, hasEnglish } from "@/lib/blog";
import { renderMarkdown, markdownExcerpt } from "@/lib/markdown";
import BlogAdminActions from "@/components/BlogAdminActions";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import SubscribeForm from "@/components/SubscribeForm";
import { translations } from "@/lib/i18n";

export const revalidate = 300;

const SITE_URL = "https://gitnewstars.vercel.app";

export function generateStaticParams() {
  return listBundledBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "글을 찾을 수 없습니다 | GitNewStars" };
  const description = markdownExcerpt(post.body, 160);
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | GitNewStars 블로그`,
    description,
    alternates: {
      canonical: url,
      // hreflang pair — crawlers see both language editions even though the
      // UI only surfaces the reader's configured language (GEO).
      ...(hasEnglish(post) && {
        languages: { ko: url, en: `${url}/en` },
      }),
    },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
    },
  };
}

/** BlogPosting + BreadcrumbList JSON-LD — the machine-readable article card
 *  AI answer engines use to attribute author/date/publisher. */
function articleJsonLd(post: {
  slug: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${SITE_URL}/blog/${post.slug}`,
        mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
        headline: post.title,
        description: markdownExcerpt(post.body, 160),
        inLanguage: "ko",
        keywords: post.tags.join(", "),
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
        author: {
          "@type": "Person",
          name: "GitNewStars 운영자",
          url: SITE_URL,
          sameAs: ["https://github.com/yjsplay2002"],
        },
        publisher: {
          "@type": "Organization",
          name: "GitNewStars",
          url: SITE_URL,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "블로그",
            item: `${SITE_URL}/blog`,
          },
          { "@type": "ListItem", position: 3, name: post.title },
        ],
      },
    ],
  };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.body);
  const edited = post.updatedAt.slice(0, 10) !== post.createdAt.slice(0, 10);

  return (
    <div className="layout">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }}
      />
      <main className="main main--blog">
        <div className="topbar">
          <TopNav active="blog" />
        </div>

        <p className="post-detail__back">
          <Link href="/blog">← 블로그로 돌아가기</Link>
          {hasEnglish(post) && (
            <Link className="blog-lang-link" href={`/blog/${post.slug}/en`}>
              Read in English →
            </Link>
          )}
        </p>

        <article className="blog-article">
          <header className="blog-article__head">
            <p className="blog-card__date">
              GitNewStars 운영자 · {fmtDate(post.createdAt)}
              {edited && ` · 수정됨 ${fmtDate(post.updatedAt)}`}
            </p>
            <h1 className="blog-article__title">{post.title}</h1>
            {post.tags.length > 0 && (
              <p className="blog-card__tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="blog-tag">
                    {tag}
                  </span>
                ))}
              </p>
            )}
            <BlogAdminActions slug={post.slug} />
          </header>
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>

        <footer className="footer">
          <SubscribeForm t={translations.ko} />
          <p className="footer__credit">
            GitHub Trending 데이터를 기반으로 제작 · Vercel에 배포됨
          </p>
        </footer>
      </main>
      <BottomNav active="blog" t={translations.ko} />
    </div>
  );
}
