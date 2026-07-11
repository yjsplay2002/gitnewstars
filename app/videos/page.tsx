import type { Metadata } from "next";
import VideosShell from "@/components/VideosShell";
import { getAiVideos } from "@/lib/videos";

// Refresh at most hourly (ISR); the daily crawl commit also redeploys.
export const revalidate = 3600;

const SITE_URL = "https://gitnewstars.vercel.app";

export const metadata: Metadata = {
  title: "AI 영상 — 팁·유즈케이스·강의 | GitNewStars",
  description: "최신 AI 활용 팁·유즈케이스·강의 유튜브 영상 모음. 매일 자동 갱신.",
  openGraph: {
    title: "AI 영상 — 팁·유즈케이스·강의 | GitNewStars",
    description: "최신 AI 활용 팁·유즈케이스·강의 유튜브 영상 모음.",
    type: "website",
    url: `${SITE_URL}/videos`,
  },
};

export default async function VideosPage() {
  const snapshot = await getAiVideos();
  return <VideosShell snapshot={snapshot} />;
}
