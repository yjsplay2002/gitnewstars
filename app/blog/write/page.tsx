import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import BlogEditor from "@/components/BlogEditor";
import { getBlog } from "@/lib/blog";

// Always fresh — the editor must see drafts and the latest content.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "글 쓰기 | GitNewStars 블로그",
  robots: { index: false },
};

export default async function BlogWritePage() {
  // Drafts included — the editor needs unpublished posts too.
  const snapshot = await getBlog(0);

  return (
    <div className="layout">
      <main className="main main--blog">
        <div className="topbar">
          <nav className="tabs">
            <Link className="tab" href="/">
              GitHub 트렌딩
            </Link>
            <Link className="tab tab--active" href="/blog">
              블로그
            </Link>
            <Link className="tab" href="/models">
              모델 비교
            </Link>
            <Link className="tab" href="/tools">
              AI 툴
            </Link>
          </nav>
        </div>

        <p className="post-detail__back">
          <Link href="/blog">← 블로그로 돌아가기</Link>
        </p>

        <Suspense>
          <BlogEditor posts={snapshot.posts} />
        </Suspense>
      </main>
    </div>
  );
}
