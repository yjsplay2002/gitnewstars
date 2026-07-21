import type { Metadata } from "next";
import Link from "next/link";
import { getCuratedPosts } from "@/lib/posts";
import { listTopics, postMatchesTopic } from "@/lib/topics";
import TopNav from "@/components/TopNav";

export const revalidate = 3600;

const SITE_URL = "https://gitnewstars.vercel.app";

export const metadata: Metadata = {
  title: "토픽 — GitNewStars",
  description: "AI 코딩 토픽별 큐레이션 소식 모음. 클로드 코드, Cursor, MCP, 바이브 코딩 등.",
  openGraph: {
    title: "토픽 — GitNewStars",
    description: "AI 코딩 토픽별 큐레이션 소식 모음",
    type: "website",
    url: `${SITE_URL}/topics`,
  },
};

export default async function TopicsIndexPage() {
  const topics = listTopics();
  const curated = await getCuratedPosts();

  const withCounts = topics.map((topic) => ({
    topic,
    count: curated.posts.filter((p) => postMatchesTopic(p, topic)).length,
  }));

  return (
    <div className="layout">
      <main className="main">
        <div className="topbar">
          <TopNav active="topics" />
        </div>

        <header className="hero">
          <p className="badge">토픽 인덱스</p>
          <h1 className="hero__title">AI 코딩 토픽</h1>
          <p className="hero__sub">
            키워드로 묶은 큐레이션 소식. 관심 토픽을 골라 보세요.
          </p>
        </header>

        <ul className="topic-grid">
          {withCounts.map(({ topic, count }) => (
            <li key={topic.slug}>
              <Link className="topic-chip" href={`/topics/${topic.slug}`}>
                <span className="topic-chip__label">{topic.labelKo}</span>
                <span className="topic-chip__en">{topic.labelEn}</span>
                <span className="topic-chip__count">{count}편</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="post-detail__back" style={{ marginTop: 24 }}>
          <Link href="/posts">← 활용 & 팁 피드</Link>
        </p>

        <footer className="footer">
          <p className="footer__credit">
            GitHub Trending 데이터를 기반으로 제작 · Vercel에 배포됨
          </p>
        </footer>
      </main>
    </div>
  );
}
