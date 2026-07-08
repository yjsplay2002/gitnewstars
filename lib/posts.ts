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
  mediaType: PostMediaType;
  mediaUrl: string;
  createdAt: string;
  mine: boolean;
  starCount: number;
  weeklyStarCount: number;
  starred: boolean;
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
    mine: Boolean(viewerEmail && post.authorEmail === viewerEmail),
    starCount,
    weeklyStarCount,
    starred,
  };
}

/** All posts (newest first) with all-time + this-week star counts. */
export async function listPosts(redis: Redis, viewerEmail: string | null): Promise<PostView[]> {
  const posts = postsOf(await redis.hgetall(postsKey()));
  posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const week = isoWeekId();
  const [starCounts, weeklyCounts, starredFlags] = await Promise.all([
    Promise.all(posts.map((p) => redis.scard(postStarsKey(p.id)))),
    Promise.all(posts.map((p) => redis.scard(postWeeklyStarsKey(p.id, week)))),
    viewerEmail
      ? Promise.all(posts.map((p) => redis.sismember(postStarsKey(p.id), viewerEmail)))
      : Promise.resolve(posts.map(() => false)),
  ]);

  return posts.map((post, i) =>
    toPostView(post, viewerEmail, starCounts[i], weeklyCounts[i], Boolean(starredFlags[i]))
  );
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
