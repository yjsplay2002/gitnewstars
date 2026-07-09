import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRequest } from "@/auth";
import { getCurrentWeek } from "@/lib/data";
import { getCuratedPosts } from "@/lib/posts";
import { buildWeeklyReport } from "@/lib/weeklyReport";
import { isoWeekId, weekLabel } from "@/lib/week";
import ShareReportClient from "./ShareReportClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "주간 공유 리포트 — GitNewStars",
  robots: { index: false, follow: false },
};

export default async function ToolsSharePage() {
  const admin = await isAdminRequest();
  if (!admin) {
    redirect("/tools");
  }

  const weekId = isoWeekId();
  let repos: Awaited<ReturnType<typeof getCurrentWeek>> = [];
  try {
    repos = await getCurrentWeek();
  } catch {
    repos = [];
  }
  const curated = await getCuratedPosts();
  const posts = [...curated.posts].sort((a, b) => {
    const aAt = a.curatedAt || a.createdAt;
    const bAt = b.curatedAt || b.createdAt;
    return bAt.localeCompare(aAt);
  });

  const markdown = buildWeeklyReport(repos, posts, {
    topN: 10,
    postsN: 5,
    weekId,
    lang: "ko",
  });

  return (
    <div className="layout">
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <Link className="tab" href="/">
              GitHub 트렌딩
            </Link>
            <Link className="tab tab--active" href="/tools">
              AI 툴
            </Link>
            <Link className="tab" href="/posts">
              활용 & 팁
            </Link>
            <Link className="tab" href="/topics">
              토픽
            </Link>
          </nav>
        </div>

        <p className="post-detail__back">
          <Link href="/tools">← AI 툴</Link>
        </p>

        <header className="hero">
          <p className="badge">관리자 전용</p>
          <h1 className="hero__title">주간 공유 리포트</h1>
          <p className="hero__sub">
            {weekLabel(weekId, "ko")} · 자동 발송 없음 · 복사 후 SNS에 붙여넣기
          </p>
        </header>

        <ShareReportClient markdown={markdown} />

        <footer className="footer">
          <p className="footer__credit">
            GitHub Trending 데이터를 기반으로 제작 · Vercel에 배포됨
          </p>
        </footer>
      </main>
    </div>
  );
}
