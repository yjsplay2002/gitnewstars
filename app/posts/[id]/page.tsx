import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostById, listBundledCuratedIds } from "@/lib/posts";
import TrackMetric from "@/components/TrackMetric";
import SourceLink from "@/components/SourceLink";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return listBundledCuratedIds().map((id) => ({ id }));
}

function excerpt(body: string, max = 160): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function fmtDateKo(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) {
    return { title: "글을 찾을 수 없습니다 — GitNewStars" };
  }
  const description = excerpt(post.body);
  return {
    title: `${post.title} — GitNewStars`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  const sourceLabel = post.sourceName || post.authorName;

  return (
    <div className="layout">
      <TrackMetric kind="detail" id={post.id} />
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <Link className="tab" href="/">
              GitHub 트렌딩
            </Link>
            <Link className="tab" href="/tools">
              AI 툴
            </Link>
            <Link className="tab tab--active" href="/posts">
              활용 & 팁
            </Link>
            <Link className="tab" href="/topics">
              토픽
            </Link>
          </nav>
        </div>

        <p className="post-detail__back">
          <Link href="/posts">← 피드로 돌아가기</Link>
        </p>

        <article className="card post post--detail">
          <div className="post__head">
            {post.authorImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="review__avatar"
                src={post.authorImage}
                alt=""
                width={26}
                height={26}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="review__avatar review__avatar--fallback">
                {(sourceLabel || "·").slice(0, 1)}
              </span>
            )}
            <span className="review__author">{sourceLabel}</span>
            {post.curated && (
              <span className="tool-badge tool-badge--oss">웹 큐레이션</span>
            )}
            <time className="review__date" dateTime={post.createdAt}>
              {fmtDateKo(post.createdAt)}
            </time>
          </div>

          <h1 className="post__title post__title--detail">{post.title}</h1>

          {(post.sourceUrl || post.sourceName) && (
            <p className="post-detail__source">
              {post.sourceUrl ? (
                <SourceLink
                  href={post.sourceUrl}
                  postId={post.id}
                  label={`${post.sourceName || "원문"} ↗`}
                />
              ) : (
                <span className="post__source">{post.sourceName}</span>
              )}
            </p>
          )}

          <p className="post__body post__body--detail">{post.body}</p>
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
