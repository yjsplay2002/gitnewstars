import { getRedis } from "./redis";
import { reviewCounts, topReviews, type TopReviewView } from "./reviews";

export interface ServerReviewData {
  counts: Record<string, number>;
  top: Record<string, TopReviewView[]>;
}

/**
 * Review counts + top-3 reviews for a page of repos, resolved on the server so
 * the cards ship complete in the ISR HTML instead of shifting after hydration.
 * Viewer is always null here: the payload is shared by every reader of the
 * cached page, so it carries no per-user state (own-review markers stay in the
 * client-side review panel).
 */
export async function getServerReviewData(
  fullNames: string[]
): Promise<ServerReviewData> {
  const redis = getRedis();
  const names = fullNames.slice(0, 50);
  if (!redis || names.length === 0) return { counts: {}, top: {} };

  try {
    const [counts, topLists] = await Promise.all([
      reviewCounts(redis, names),
      Promise.all(names.map((name) => topReviews(redis, name, null, 3))),
    ]);
    return {
      counts,
      top: Object.fromEntries(names.map((name, i) => [name, topLists[i]])),
    };
  } catch {
    // Redis unreachable — cards still render, just without review data.
    return { counts: {}, top: {} };
  }
}
