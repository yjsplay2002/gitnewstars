import type { Metadata } from "next";
import PostsShell from "@/components/PostsShell";

// Feed is user-generated and fetched client-side; the shell itself is static.
export const metadata: Metadata = {
  title: "AI 활용 사례 & 팁 — GitNewStars",
  description: "AI 사용 후기, 워크플로우, 팁을 공유하고 이번 주 최고 추천 글을 확인하세요.",
};

export default function PostsPage() {
  return <PostsShell />;
}
