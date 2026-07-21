import type { Metadata } from "next";
import BlogShell from "@/components/BlogShell";
import { listBlogPosts } from "@/lib/blog";
import { getChannelVideos } from "@/lib/youtube";

export const revalidate = 300;

const SITE_URL = "https://gitnewstars.vercel.app";

export const metadata: Metadata = {
  title: "블로그 — AI 코딩 도구·모델·자동화 | GitNewStars",
  description:
    "AI 코딩 도구 사용기, 모델 분석, 자동화 파이프라인 구축 기록. GitNewStars 기술 블로그.",
  openGraph: {
    title: "블로그 — AI 코딩 도구·모델·자동화 | GitNewStars",
    description: "AI 코딩 도구 사용기, 모델 분석, 자동화 파이프라인 구축 기록.",
    type: "website",
    url: `${SITE_URL}/blog`,
  },
};

export default async function BlogPage() {
  const [posts, videos] = await Promise.all([listBlogPosts(), getChannelVideos()]);
  return <BlogShell posts={posts} videos={videos} />;
}
