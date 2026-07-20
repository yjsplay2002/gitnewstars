import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic, listTopics, postsForTopic } from "@/lib/topics";

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = "https://gitnewstars.vercel.app";

export async function generateStaticParams() {
  return listTopics().map((t) => ({ slug: t.slug }));
}

function excerpt(body: string, max = 140): string {
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) {
    return { title: "토픽을 찾을 수 없습니다 — GitNewStars" };
  }
  const title = `${topic.labelKo} 관련 AI 코딩 소식 — GitNewStars`;
  const description = `${topic.labelKo}(${topic.labelEn}) 관련 한국어 AI 코딩 큐레이션 소식.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/topics/${slug}`,
    },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const posts = await postsForTopic(slug);

  return (
    <div className="layout">
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <Link className="tab" href="/">
              GitHub 트렌딩
            </Link>
            <Link className="tab" href="/models">
              모델 비교
            </Link>
            <Link className="tab" href="/tools">
              AI 툴
            </Link>
            <Link className="tab" href="/posts">
              활용 & 팁
            </Link>
            <Link className="tab tab--active" href="/topics">
              토픽
            </Link>
          </nav>
        </div>

        <p className="post-detail__back">
          <Link href="/topics">← 전체 토픽</Link>
        </p>

        <header className="hero">
          <p className="badge">{topic.labelEn}</p>
          <h1 className="hero__title">{topic.labelKo}</h1>
          <p className="hero__sub">
            {topic.labelKo} 관련 AI 코딩 소식 {posts.length}편
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="card" style={{ padding: "28px 24px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              아직 글 없음. 곧 큐레이션이 쌓이면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <ul className="list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {posts.map((post) => (
              <li key={post.id} style={{ marginBottom: 14 }}>
                <article className="card post">
                  <div className="post__head">
                    <span className="review__avatar review__avatar--fallback">
                      {(post.sourceName || "·").slice(0, 1)}
                    </span>
                    <span className="review__author">{post.sourceName}</span>
                    <span className="tool-badge tool-badge--oss">웹 큐레이션</span>
                    <time className="review__date" dateTime={post.createdAt}>
                      {fmtDateKo(post.createdAt)}
                    </time>
                  </div>
                  <h2 className="post__title" style={{ fontSize: 18 }}>
                    <Link href={`/posts/${post.id}`} className="post__title-link">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="post__body">{excerpt(post.body)}</p>
                </article>
              </li>
            ))}
          </ul>
        )}

        <footer className="footer">
          <p className="footer__credit">
            GitHub Trending 데이터를 기반으로 제작 · Vercel에 배포됨
          </p>
        </footer>
      </main>
    </div>
  );
}
