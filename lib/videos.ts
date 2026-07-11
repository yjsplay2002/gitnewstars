/**
 * AI videos directory — latest YouTube tips, usecases, and lectures. The
 * snapshot lives in data/ai-videos.json (git-as-DB): the daily research
 * routine rewrites the file and commits, redeploying with fresh videos.
 */
import { readJson } from "./github";
import bundled from "@/data/ai-videos.json";

export type VideoCategory = "tip" | "usecase" | "lecture";

export interface AiVideo {
  id: string; // stable slug
  youtubeId: string; // 11-char YouTube id used for the embed
  category: VideoCategory;
  title: string; // Korean label
  titleEn?: string; // original / English title
  descKo?: string;
  descEn?: string;
  channel?: string;
  publishedAt?: string; // ISO — original upload date (best effort)
  addedAt: string; // ISO — when curated into the feed; drives ordering
}

export interface AiVideosSnapshot {
  generatedAt: string;
  videos: AiVideo[];
}

export const VIDEO_CATEGORIES: { key: VideoCategory; ko: string; en: string }[] = [
  { key: "tip", ko: "팁", en: "Tips" },
  { key: "usecase", ko: "유즈케이스", en: "Usecases" },
  { key: "lecture", ko: "강의", en: "Lectures" },
];

const YT_ID_RE = /^[\w-]{11}$/;

/** Sort key: newest first by upload date, falling back to curation date. */
function videoSortKey(v: AiVideo): string {
  return v.publishedAt || v.addedAt || "";
}

/**
 * Current snapshot, newest first. Prefer the live file from the data repo
 * (picks up the daily commit without a redeploy); fall back to the bundled
 * copy. Malformed entries (bad YouTube id) are dropped defensively.
 */
export async function getAiVideos(): Promise<AiVideosSnapshot> {
  const live = await readJson<AiVideosSnapshot>("data/ai-videos.json", 300);
  const snap = live ?? (bundled as AiVideosSnapshot);
  const videos = (snap.videos ?? [])
    .filter((v) => v && typeof v.youtubeId === "string" && YT_ID_RE.test(v.youtubeId))
    .sort((a, b) => videoSortKey(b).localeCompare(videoSortKey(a)));
  return { generatedAt: snap.generatedAt, videos };
}
