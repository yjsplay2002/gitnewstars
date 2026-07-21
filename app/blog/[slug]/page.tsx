import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPost, listBundledBlogSlugs } from "@/lib/blog";
import { renderMarkdown, markdownExcerpt } from "@/lib/markdown";
import BlogAdminActions from "@/components/BlogAdminActions";
import TopNav from "@/components/TopNav";

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
  return {
    title: `${post.title} | GitNewStars 블로그`,
    description,
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
      <main className="main main--blog">
        <div className="topbar">
          <TopNav active="blog" />
        </div>

        <p className="post-detail__back">
          <Link href="/blog">← 블로그로 돌아가기</Link>
        </p>

        <article className="blog-article">
          <header className="blog-article__head">
            <p className="blog-card__date">
              {fmtDate(post.createdAt)}
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
          <p className="footer__credit">
            GitHub Trending 데이터를 기반으로 제작 · Vercel에 배포됨
          </p>
        </footer>
      </main>
    </div>
  );
}
