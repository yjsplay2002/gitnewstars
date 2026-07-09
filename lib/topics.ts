/**
 * Topic landings for curated posts. Posts have no tags field — membership
 * is derived by keyword matching on title/body (ko+en). Schema unchanged.
 */
import {
  getCuratedPosts,
  type CuratedPost,
  type CuratedPostsSnapshot,
} from "./posts";
import bundledCurated from "@/data/curated-posts.json";

export interface Topic {
  slug: string;
  labelKo: string;
  labelEn: string;
  keywords: string[];
}

export const TOPICS: Topic[] = [
  {
    slug: "claude-code",
    labelKo: "클로드 코드",
    labelEn: "Claude Code",
    keywords: ["클로드 코드", "claude code", "claudecode"],
  },
  {
    slug: "codex",
    labelKo: "Codex",
    labelEn: "Codex",
    keywords: ["codex", "openai codex"],
  },
  {
    slug: "cursor",
    labelKo: "Cursor",
    labelEn: "Cursor",
    keywords: ["cursor"],
  },
  {
    slug: "mcp",
    labelKo: "MCP",
    labelEn: "MCP",
    keywords: ["mcp", "모델 컨텍스트", "model context protocol"],
  },
  {
    slug: "gemini",
    labelKo: "제미나이",
    labelEn: "Gemini",
    keywords: ["제미나이", "gemini"],
  },
  {
    slug: "vibe-coding",
    labelKo: "바이브 코딩",
    labelEn: "Vibe Coding",
    keywords: ["바이브 코딩", "vibe coding", "vibe-coding"],
  },
];

export function listTopics(): Topic[] {
  return TOPICS;
}

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

/** Lowercased haystack from all title/body language variants. */
function postHaystack(post: CuratedPost): string {
  return [post.title, post.body, post.titleEn, post.bodyEn]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

/** True when any topic keyword appears in the post text. */
export function postMatchesTopic(post: CuratedPost, topic: Topic): boolean {
  const hay = postHaystack(post);
  return topic.keywords.some((kw) => hay.includes(kw.toLowerCase()));
}

/**
 * Curated posts matching a topic slug, newest curatedAt first.
 * Returns [] for unknown slug (caller decides 404 vs empty landing).
 */
export async function postsForTopic(slug: string): Promise<CuratedPost[]> {
  const topic = getTopic(slug);
  if (!topic) return [];

  const snapshot = await getCuratedPosts();
  return snapshot.posts
    .filter((p) => postMatchesTopic(p, topic))
    .sort((a, b) => {
      const aAt = a.curatedAt || a.createdAt;
      const bAt = b.curatedAt || b.createdAt;
      return bAt.localeCompare(aAt);
    });
}

/** Bundled-only match counts for static generation / sitemap (no network). */
export function listBundledTopicCounts(): { slug: string; count: number }[] {
  const posts = (bundledCurated as CuratedPostsSnapshot).posts;
  return TOPICS.map((topic) => ({
    slug: topic.slug,
    count: posts.filter((p) => postMatchesTopic(p, topic)).length,
  }));
}

/** Topics whose keywords match a free-text needle (tool name, etc.). */
export function topicsMatchingText(text: string): Topic[] {
  const hay = text.toLowerCase();
  return TOPICS.filter((t) =>
    t.keywords.some((kw) => hay.includes(kw.toLowerCase()) || kw.toLowerCase().includes(hay))
  );
}
