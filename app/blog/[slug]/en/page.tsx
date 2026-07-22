import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, listBundledBlogSlugsEn, hasEnglish } from "@/lib/blog";
import { renderMarkdown, markdownExcerpt } from "@/lib/markdown";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import SubscribeForm from "@/components/SubscribeForm";
import { translations } from "@/lib/i18n";

export const revalidate = 300;

const SITE_URL = "https://gitnewstars.vercel.app";

export function generateStaticParams() {
  return listBundledBlogSlugsEn().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || !hasEnglish(post)) return { title: "Not found | GitNewStars" };
  const description = markdownExcerpt(post.bodyEn!, 160);
  const koUrl = `${SITE_URL}/blog/${post.slug}`;
  const enUrl = `${koUrl}/en`;
  return {
    title: `${post.titleEn} | GitNewStars Blog`,
    description,
    alternates: {
      canonical: enUrl,
      languages: { ko: koUrl, en: enUrl },
    },
    openGraph: {
      title: post.titleEn,
      description,
      type: "article",
      url: enUrl,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
    },
  };
}

function articleJsonLd(post: {
  slug: string;
  titleEn?: string;
  bodyEn?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}) {
  const enUrl = `${SITE_URL}/blog/${post.slug}/en`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": enUrl,
    mainEntityOfPage: enUrl,
    headline: post.titleEn,
    description: markdownExcerpt(post.bodyEn ?? "", 160),
    inLanguage: "en",
    keywords: post.tags.join(", "),
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    translationOfWork: { "@id": `${SITE_URL}/blog/${post.slug}` },
    author: {
      "@type": "Person",
      name: "GitNewStars Operator",
      url: SITE_URL,
      sameAs: ["https://github.com/yjsplay2002"],
    },
    publisher: {
      "@type": "Organization",
      name: "GitNewStars",
      url: SITE_URL,
    },
  };
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogArticleEnPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post || !hasEnglish(post)) notFound();

  const html = renderMarkdown(post.bodyEn!);
  const edited = post.updatedAt.slice(0, 10) !== post.createdAt.slice(0, 10);

  return (
    <div className="layout">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd(post)) }}
      />
      <main className="main main--blog">
        <div className="topbar">
          <TopNav active="blog" t={translations.en} />
        </div>

        <p className="post-detail__back">
          <Link href="/blog">← Back to blog</Link>
          <Link className="blog-lang-link" href={`/blog/${post.slug}`}>
            한국어로 읽기 →
          </Link>
        </p>

        <article className="blog-article">
          <header className="blog-article__head">
            <p className="blog-card__date">
              GitNewStars Operator · {fmtDate(post.createdAt)}
              {edited && ` · Updated ${fmtDate(post.updatedAt)}`}
            </p>
            <h1 className="blog-article__title">{post.titleEn}</h1>
            {post.tags.length > 0 && (
              <p className="blog-card__tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="blog-tag">
                    {tag}
                  </span>
                ))}
              </p>
            )}
          </header>
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>

        <footer className="footer">
          <SubscribeForm t={translations.en} />
          <p className="footer__credit">
            Built on GitHub Trending data · Deployed on Vercel
          </p>
        </footer>
      </main>
      <BottomNav active="blog" t={translations.en} />
    </div>
  );
}
