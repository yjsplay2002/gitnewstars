/**
 * Community posts — AI usage stories, usecases, workflows, and tips.
 * Stored in Upstash Redis (same instance as reviews). Layout:
 *   posts                     hash: postId -> StoredPost JSON
 *   post-stars:<id>           set: emails (all-time stars)
 *   post-stars:<id>:<weekId>  set: emails (stars given during that ISO week)
 * Weekly sets power the GitHub-trending-style "top this week" sidebar.
 * The author's email is kept server-side only; clients get a `mine` flag.
 */
import type { Redis } from "@upstash/redis";
import { isoWeekId } from "./week";
import { readJson } from "./github";
import { getRedis } from "./redis";
import bundledCurated from "@/data/curated-posts.json";

export const POST_TITLE_MAX_LEN = 120;
export const POST_BODY_MAX_LEN = 3000;
export const POST_URL_MAX_LEN = 500;

export type PostMediaType = "none" | "image" | "video";

export interface StoredPost {
  id: string;
  authorName: string;
  authorImage: string;
  authorEmail: string; // internal only — never serialized to the client
  title: string;
  body: string;
  mediaType: PostMediaType;
  mediaUrl: string; // empty when mediaType is "none"
  createdAt: string;
}

export interface PostView {
  id: string;
  authorName: string;
  authorImage: string;
  title: string;
  body: string;
  titleEn?: string; // curated posts carry both languages
  bodyEn?: string;
  mediaType: PostMediaType;
  mediaUrl: string;
  createdAt: string; // publish date — shown as the item's date label
  sortAt: string; // ordering key: curatedAt for curated posts, else createdAt
  mine: boolean;
  starCount: number;
  weeklyStarCount: number;
  starred: boolean;
  curated?: boolean;
  sourceName?: string;
  sourceUrl?: string;
}

/**
 * Curated posts — crawled daily from the web (HN, Reddit, blogs …) by the
 * scheduled research routine, which rewrites data/curated-posts.json and
 * commits (git-as-DB, same pattern as ai-tools.json). They join the feed
 * alongside user posts and take stars/reviews through the same Redis keys.
 */
export interface CuratedPost {
  id: string; // stable slug, e.g. "curated-2026-07-08-claude-report"
  title: string; // Korean
  body: string; // Korean summary
  titleEn: string;
  bodyEn: string;
  sourceName: string; // e.g. "Hacker News", "Reddit r/ClaudeAI"
  sourceUrl: string;
  mediaType: PostMediaType;
  mediaUrl: string;
  createdAt: string; // ISO — original publish date of the source (shown as the label)
  curatedAt?: string; // ISO — when this item was first pulled into the feed; drives ordering
}

export interface CuratedPostsSnapshot {
  generatedAt: string;
  posts: CuratedPost[];
}

export const CURATED_ID_RE = /^curated-[\w-]+$/;

/** Live file from the data repo when available, bundled copy otherwise. */
export async function getCuratedPosts(): Promise<CuratedPostsSnapshot> {
  const live = await readJson<CuratedPostsSnapshot>("data/curated-posts.json", 300);
  return live ?? (bundledCurated as CuratedPostsSnapshot);
}

export const postsKey = () => "posts";
export const postStarsKey = (id: string) => `post-stars:${id}`;
export const postWeeklyStarsKey = (id: string, weekId = isoWeekId()) =>
  `post-stars:${id}:${weekId}`;

/** Keep weekly star sets around for ~3 weeks so past rankings age out. */
const WEEKLY_SET_TTL_SECONDS = 3 * 7 * 24 * 3600;

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/;
const IMAGE_RE = /\.(?:png|jpe?g|gif|webp|avif|svg)(?:\?.*)?$/i;
const VIDEO_FILE_RE = /\.(?:mp4|webm|mov)(?:\?.*)?$/i;

/** YouTube video id, or null when the URL is not a YouTube link. */
export function youtubeId(url: string): string | null {
  const m = url.match(YOUTUBE_RE);
  return m ? m[1] : null;
}

/** Classify a media URL: YouTube/video files -> video, image files -> image. */
export function detectMediaType(url: string): PostMediaType {
  if (!url) return "none";
  if (YOUTUBE_RE.test(url) || VIDEO_FILE_RE.test(url)) return "video";
  if (IMAGE_RE.test(url)) return "image";
  return "image"; // unknown URLs render as a plain link inside the image slot
}

function postsOf(hash: Record<string, unknown> | null): StoredPost[] {
  if (!hash) return [];
  return Object.values(hash).filter(
    (v): v is StoredPost =>
      typeof v === "object" && v !== null && typeof (v as StoredPost).id === "string"
  );
}

export function toPostView(
  post: StoredPost,
  viewerEmail: string | null,
  starCount: number,
  weeklyStarCount: number,
  starred: boolean
): PostView {
  return {
    id: post.id,
    authorName: post.authorName,
    authorImage: post.authorImage,
    title: post.title,
    body: post.body,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    sortAt: post.createdAt,
    mine: Boolean(viewerEmail && post.authorEmail === viewerEmail),
    starCount,
    weeklyStarCount,
    starred,
  };
}

export function curatedToView(post: CuratedPost): PostView {
  return {
    id: post.id,
    authorName: post.sourceName,
    authorImage: "",
    title: post.title,
    body: post.body,
    titleEn: post.titleEn,
    bodyEn: post.bodyEn,
    mediaType: post.mediaType,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    sortAt: post.curatedAt || post.createdAt,
    mine: false,
    starCount: 0,
    weeklyStarCount: 0,
    starred: false,
    curated: true,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
  };
}

/**
 * Load a single post for the detail page. Curated ids match CURATED_ID_RE
 * and come from the snapshot; everything else is a user post in Redis.
 * Returns null when missing or when Redis is unconfigured for a user id.
 */
export async function getPostById(id: string): Promise<PostView | null> {
  if (!id) return null;

  if (CURATED_ID_RE.test(id)) {
    const curated = await getCuratedPosts();
    const post = curated.posts.find((p) => p.id === id);
    return post ? curatedToView(post) : null;
  }

  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.hget<StoredPost | string>(postsKey(), id);
  if (!raw) return null;
  // Upstash may return the hash field already parsed or still as a JSON string.
  let stored: StoredPost;
  if (typeof raw === "string") {
    try {
      stored = JSON.parse(raw) as StoredPost;
    } catch {
      return null;
    }
  } else {
    stored = raw;
  }
  if (!stored.id) return null;
  return toPostView(stored, null, 0, 0, false);
}

/** Bundled curated post ids — used by generateStaticParams / sitemap. */
export function listBundledCuratedIds(): string[] {
  return (bundledCurated as CuratedPostsSnapshot).posts.map((p) => p.id);
}

/**
 * User posts (Redis) merged with curated posts (crawled JSON), newest first,
 * each with all-time + this-week star counts from the shared Redis star keys.
 */
export async function listPosts(
  redis: Redis,
  viewerEmail: string | null,
  curated: CuratedPost[] = []
): Promise<PostView[]> {
  const userPosts = postsOf(await redis.hgetall(postsKey()));
  const views: PostView[] = [
    ...userPosts.map((p) => toPostView(p, viewerEmail, 0, 0, false)),
    ...curated.map(curatedToView),
  ];
  // Newest publish date first (the date label the reader sees), with the
  // curation date (sortAt) as a tiebreaker so same-day items keep a stable,
  // fresh-first order.
  views.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.sortAt.localeCompare(a.sortAt)
  );

  const week = isoWeekId();
  const [starCounts, weeklyCounts, starredFlags] = await Promise.all([
    Promise.all(views.map((p) => redis.scard(postStarsKey(p.id)))),
    Promise.all(views.map((p) => redis.scard(postWeeklyStarsKey(p.id, week)))),
    viewerEmail
      ? Promise.all(views.map((p) => redis.sismember(postStarsKey(p.id), viewerEmail)))
      : Promise.resolve(views.map(() => false)),
  ]);

  return views.map((view, i) => ({
    ...view,
    starCount: starCounts[i],
    weeklyStarCount: weeklyCounts[i],
    starred: Boolean(starredFlags[i]),
  }));
}

/**
 * Toggle the viewer's star on a post. Stars are added to both the all-time
 * and the current-week set; unstarring removes from both (a star given in a
 * past week keeps its weekly credit — same spirit as GitHub trending).
 */
export async function togglePostStar(
  redis: Redis,
  postId: string,
  viewerEmail: string
): Promise<{ starCount: number; weeklyStarCount: number; starred: boolean }> {
  const allKey = postStarsKey(postId);
  const weekKey = postWeeklyStarsKey(postId);
  const already = await redis.sismember(allKey, viewerEmail);
  if (already) {
    await Promise.all([redis.srem(allKey, viewerEmail), redis.srem(weekKey, viewerEmail)]);
  } else {
    await Promise.all([redis.sadd(allKey, viewerEmail), redis.sadd(weekKey, viewerEmail)]);
    await redis.expire(weekKey, WEEKLY_SET_TTL_SECONDS);
  }
  const [starCount, weeklyStarCount] = await Promise.all([
    redis.scard(allKey),
    redis.scard(weekKey),
  ]);
  return { starCount, weeklyStarCount, starred: !already };
}
