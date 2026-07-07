/**
 * Reviews & comments, stored in Upstash Redis (same instance as the visitor
 * counter). Layout:
 *   reviews:<owner/repo>          hash: reviewId  -> StoredEntry JSON
 *   review-comments:<reviewId>    hash: commentId -> StoredEntry JSON
 * The author's email is kept server-side only for ownership checks; clients
 * receive a computed `mine` flag instead.
 */
import type { Redis } from "@upstash/redis";

export const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
export const REVIEW_MAX_LEN = 1000;
export const COMMENT_MAX_LEN = 500;

export interface StoredEntry {
  id: string;
  authorName: string;
  authorImage: string;
  authorEmail: string; // internal only — never serialized to the client
  text: string;
  createdAt: string;
}

export interface CommentView {
  id: string;
  authorName: string;
  authorImage: string;
  text: string;
  createdAt: string;
  mine: boolean;
}

export interface ReviewView extends CommentView {
  comments: CommentView[];
  starCount: number;
  starred: boolean;
}

export interface TopReviewView extends CommentView {
  starCount: number;
}

export const reviewsKey = (repo: string) => `reviews:${repo}`;
export const commentsKey = (reviewId: string) => `review-comments:${reviewId}`;
export const starsKey = (reviewId: string) => `review-stars:${reviewId}`;

export function toView(entry: StoredEntry, viewerEmail: string | null): CommentView {
  return {
    id: entry.id,
    authorName: entry.authorName,
    authorImage: entry.authorImage,
    text: entry.text,
    createdAt: entry.createdAt,
    mine: Boolean(viewerEmail && entry.authorEmail === viewerEmail),
  };
}

/** Toggle the viewer's star on a review. Returns the new state. */
export async function toggleStar(
  redis: Redis,
  reviewId: string,
  viewerEmail: string
): Promise<{ starCount: number; starred: boolean }> {
  const key = starsKey(reviewId);
  const already = await redis.sismember(key, viewerEmail);
  if (already) {
    await redis.srem(key, viewerEmail);
  } else {
    await redis.sadd(key, viewerEmail);
  }
  const starCount = await redis.scard(key);
  return { starCount, starred: !already };
}

function entriesOf(hash: Record<string, unknown> | null): StoredEntry[] {
  if (!hash) return [];
  return Object.values(hash).filter(
    (v): v is StoredEntry =>
      typeof v === "object" && v !== null && typeof (v as StoredEntry).id === "string"
  );
}

/** All reviews for a repo (newest first), each with its comments (oldest first). */
export async function listReviews(
  redis: Redis,
  repo: string,
  viewerEmail: string | null
): Promise<ReviewView[]> {
  const reviews = entriesOf(await redis.hgetall(reviewsKey(repo)));
  reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const [commentHashes, starCounts, starredFlags] = await Promise.all([
    Promise.all(reviews.map((r) => redis.hgetall(commentsKey(r.id)))),
    Promise.all(reviews.map((r) => redis.scard(starsKey(r.id)))),
    viewerEmail
      ? Promise.all(reviews.map((r) => redis.sismember(starsKey(r.id), viewerEmail)))
      : Promise.resolve(reviews.map(() => false)),
  ]);

  return reviews.map((review, i) => {
    const comments = entriesOf(commentHashes[i]);
    comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return {
      ...toView(review, viewerEmail),
      comments: comments.map((c) => toView(c, viewerEmail)),
      starCount: starCounts[i],
      starred: Boolean(starredFlags[i]),
    };
  });
}

/** Top reviews for a repo: most-starred first, oldest-first when tied (incl. all-zero). No comments. */
export async function topReviews(
  redis: Redis,
  repo: string,
  viewerEmail: string | null,
  limit = 3
): Promise<TopReviewView[]> {
  const reviews = entriesOf(await redis.hgetall(reviewsKey(repo)));
  if (reviews.length === 0) return [];

  const starCounts = await Promise.all(reviews.map((r) => redis.scard(starsKey(r.id))));
  const ranked = reviews
    .map((review, i) => ({ review, starCount: starCounts[i] }))
    .sort(
      (a, b) => b.starCount - a.starCount || a.review.createdAt.localeCompare(b.review.createdAt)
    )
    .slice(0, limit);

  return ranked.map(({ review, starCount }) => ({
    ...toView(review, viewerEmail),
    starCount,
  }));
}

/** Review counts for a batch of repos, keyed by fullName. */
export async function reviewCounts(
  redis: Redis,
  repos: string[]
): Promise<Record<string, number>> {
  const counts = await Promise.all(repos.map((r) => redis.hlen(reviewsKey(r))));
  return Object.fromEntries(repos.map((r, i) => [r, counts[i]]));
}
