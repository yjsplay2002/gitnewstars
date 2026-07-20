import type { Metadata } from "next";
import ModelsShell from "@/components/ModelsShell";

const SITE_URL = "https://gitnewstars.vercel.app";

export const metadata: Metadata = {
  title: "AI 코딩 모델 비교 — SWE-bench·가격·컨텍스트 | GitNewStars",
  description:
    "Claude, GPT, Gemini 등 주요 API 코딩 모델을 SWE-bench 점수·가격·컨텍스트로 한눈에 비교.",
  openGraph: {
    title: "AI 코딩 모델 비교 — SWE-bench·가격·컨텍스트 | GitNewStars",
    description:
      "Claude, GPT, Gemini 등 주요 API 코딩 모델을 SWE-bench 점수·가격·컨텍스트로 한눈에 비교.",
    type: "website",
    url: `${SITE_URL}/models`,
  },
};

export default function ModelsPage() {
  return <ModelsShell />;
}
