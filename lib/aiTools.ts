/**
 * AI tools directory — categorized, popularity-ranked. The snapshot lives in
 * data/ai-tools.json (git-as-DB): the weekly research routine rewrites the
 * file and commits, which redeploys the site with fresh rankings.
 */
import { readJson } from "./github";
import bundled from "@/data/ai-tools.json";

/** Slug must be usable as the review key suffix ("ai-tools/<slug>"). */
export const TOOL_SLUG_RE = /^[\w.-]+$/;

export interface AiTool {
  slug: string; // stable id, e.g. "chatgpt"
  name: string;
  category: string; // category key, e.g. "llm-chat"
  url: string;
  vendor: string;
  descEn: string;
  descKo: string;
  pricing: "free" | "freemium" | "paid";
  openSource: boolean;
  githubRepo?: string; // "owner/repo" when open source
  score: number; // 0-100 composite popularity from the weekly research
  isNew?: boolean; // newly notable (H2 2025 onwards)
}

export interface AiToolCategory {
  key: string;
  ko: string;
  en: string;
  emoji: string;
}

export interface AiToolsSnapshot {
  generatedAt: string; // ISO timestamp
  weekId: string; // e.g. "2026-W28"
  categories: AiToolCategory[];
  tools: AiTool[];
}

/**
 * Current snapshot: prefer the live file from the data repo (picks up the
 * weekly commit without a redeploy), fall back to the bundled copy.
 */
export async function getAiTools(): Promise<AiToolsSnapshot> {
  const live = await readJson<AiToolsSnapshot>("data/ai-tools.json", 300);
  return live ?? (bundled as AiToolsSnapshot);
}

/** Tools of one category, highest score first. */
export function toolsByCategory(snapshot: AiToolsSnapshot, categoryKey: string): AiTool[] {
  return snapshot.tools
    .filter((t) => t.category === categoryKey)
    .sort((a, b) => b.score - a.score);
}

/** Single tool by slug from live snapshot, or null. */
export async function getToolBySlug(slug: string): Promise<AiTool | null> {
  if (!slug || !TOOL_SLUG_RE.test(slug)) return null;
  const snapshot = await getAiTools();
  return snapshot.tools.find((t) => t.slug === slug) ?? null;
}

/** Bundled tool slugs for generateStaticParams / sitemap. */
export function listToolSlugs(): string[] {
  return (bundled as AiToolsSnapshot).tools.map((t) => t.slug);
}

/** Category metadata for a tool, or null. */
export function categoryForTool(
  snapshot: AiToolsSnapshot,
  categoryKey: string
): AiToolCategory | undefined {
  return snapshot.categories.find((c) => c.key === categoryKey);
}

