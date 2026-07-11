import type { Metadata } from "next";
import SkillsShell from "@/components/SkillsShell";
import { getSkills } from "@/lib/skills";

// Refresh at most hourly (ISR); the daily crawl commit also redeploys.
export const revalidate = 3600;

const SITE_URL = "https://gitnewstars.vercel.app";

export const metadata: Metadata = {
  title: "무료 AI 스킬 랭킹 — 스타 순 | GitNewStars",
  description: "GitHub 스타가 많은 무료 오픈소스 Claude Code·에이전트 스킬 순위. 매일 자동 갱신.",
  openGraph: {
    title: "무료 AI 스킬 랭킹 — 스타 순 | GitNewStars",
    description: "GitHub 스타가 많은 무료 오픈소스 Claude Code·에이전트 스킬 순위.",
    type: "website",
    url: `${SITE_URL}/skills`,
  },
};

export default async function SkillsPage() {
  const snapshot = await getSkills();
  return <SkillsShell snapshot={snapshot} />;
}
