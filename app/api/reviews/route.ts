import { NextResponse } from "next/server";
import { auth, ADMIN_EMAIL } from "@/auth";
import { getRedis } from "@/lib/redis";
import {
  REPO_RE,
  REVIEW_MAX_LEN,
  type StoredEntry,
  commentsKey,
  listReviews,
  reviewCounts,
  reviewsKey,
  toView,
  topReviews,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

const POST_COOLDOWN_SECONDS = 10;

async function viewer() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  return {
    email,
    name: session?.user?.name ?? "",
    image: session?.user?.image ?? "",
    isAdmin: Boolean(email && email === ADMIN_EMAIL.toLowerCase()),
  };
}

/**
 * GET ?repo=owner/repo   -> { reviews: ReviewView[] }
 * GET ?counts=a/b,c/d    -> { counts: { "a/b": n, ... } }
 * GET ?topFor=a/b,c/d    -> { top: { "a/b": TopReviewView[], ... } }
 */
export async function GET(req: Request) {
  const redis = getRedis();
  const { searchParams } = new URL(req.url);

  const countsParam = searchParams.get("counts");
  if (countsParam !== null) {
    const repos = countsParam
      .split(",")
      .filter((r) => REPO_RE.test(r))
      .slice(0, 50);
    if (!redis || repos.length === 0) return NextResponse.json({ counts: {} });
    return NextResponse.json({ counts: await reviewCounts(redis, repos) });
  }

  const topForParam = searchParams.get("topFor");
  if (topForParam !== null) {
    const repos = topForParam
      .split(",")
      .filter((r) => REPO_RE.test(r))
      .slice(0, 50);
    if (!redis || repos.length === 0) return NextResponse.json({ top: {} });
    const { email } = await viewer();
    const entries = await Promise.all(repos.map((r) => topReviews(redis, r, email, 3)));
    return NextResponse.json({ top: Object.fromEntries(repos.map((r, i) => [r, entries[i]])) });
  }

  const repo = searchParams.get("repo") ?? "";
  if (!REPO_RE.test(repo)) {
    return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  }
  if (!redis) return NextResponse.json({ reviews: [] });

  const { email } = await viewer();
  return NextResponse.json({ reviews: await listReviews(redis, repo, email) });
}

/** POST { repo, text } -> { review: ReviewView } (requires sign-in) */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const user = await viewer();
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { repo?: string; text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const repo = typeof body.repo === "string" ? body.repo : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!REPO_RE.test(repo)) return NextResponse.json({ error: "Invalid repo" }, { status: 400 });
  if (!text || text.length > REVIEW_MAX_LEN) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  // Light anti-spam: one post (review or comment) per user per 10s.
  const fresh = await redis.set(`rl:ugc:${user.email}`, "1", {
    nx: true,
    ex: POST_COOLDOWN_SECONDS,
  });
  if (fresh !== "OK") return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const entry: StoredEntry = {
    id: crypto.randomUUID(),
    authorName: user.name,
    authorImage: user.image,
    authorEmail: user.email,
    text,
    createdAt: new Date().toISOString(),
  };
  await redis.hset(reviewsKey(repo), { [entry.id]: entry });

  return NextResponse.json({ review: { ...toView(entry, user.email), comments: [] } });
}

/** DELETE ?repo=&id= — author or admin only. Removes the review and its comments. */
export async function DELETE(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const user = await viewer();
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo") ?? "";
  const id = searchParams.get("id") ?? "";
  if (!REPO_RE.test(repo) || !id) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const entry = await redis.hget<StoredEntry>(reviewsKey(repo), id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.authorEmail !== user.email && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Promise.all([redis.hdel(reviewsKey(repo), id), redis.del(commentsKey(id))]);
  return NextResponse.json({ ok: true });
}
