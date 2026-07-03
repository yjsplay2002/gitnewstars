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
}

export const reviewsKey = (repo: string) => `reviews:${repo}`;
export const commentsKey = (reviewId: string) => `review-comments:${reviewId}`;

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

  const commentHashes = await Promise.all(
    reviews.map((r) => redis.hgetall(commentsKey(r.id)))
  );

  return reviews.map((review, i) => {
    const comments = entriesOf(commentHashes[i]);
    comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { ...toView(review, viewerEmail), comments: comments.map((c) => toView(c, viewerEmail)) };
  });
}

/** Review counts for a batch of repos, keyed by fullName. */
export async function reviewCounts(
  redis: Redis,
  repos: string[]
): Promise<Record<string, number>> {
  const counts = await Promise.all(repos.map((r) => redis.hlen(reviewsKey(r))));
  return Object.fromEntries(repos.map((r, i) => [r, counts[i]]));
}
