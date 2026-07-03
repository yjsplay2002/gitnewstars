import { NextResponse } from "next/server";
import { auth, ADMIN_EMAIL } from "@/auth";
import { getRedis } from "@/lib/redis";
import {
  COMMENT_MAX_LEN,
  REPO_RE,
  type StoredEntry,
  commentsKey,
  reviewsKey,
  toView,
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

/** POST { repo, reviewId, text } -> { comment: CommentView } (requires sign-in) */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const user = await viewer();
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { repo?: string; reviewId?: string; text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const repo = typeof body.repo === "string" ? body.repo : "";
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!REPO_RE.test(repo) || !reviewId) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  if (!text || text.length > COMMENT_MAX_LEN) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  // The review must still exist (it may have been deleted meanwhile).
  const exists = await redis.hexists(reviewsKey(repo), reviewId);
  if (!exists) return NextResponse.json({ error: "Review not found" }, { status: 404 });

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
  await redis.hset(commentsKey(reviewId), { [entry.id]: entry });

  return NextResponse.json({ comment: toView(entry, user.email) });
}

/** DELETE ?reviewId=&id= — author or admin only. */
export async function DELETE(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const user = await viewer();
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reviewId = searchParams.get("reviewId") ?? "";
  const id = searchParams.get("id") ?? "";
  if (!reviewId || !id) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const entry = await redis.hget<StoredEntry>(commentsKey(reviewId), id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (entry.authorEmail !== user.email && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await redis.hdel(commentsKey(reviewId), id);
  return NextResponse.json({ ok: true });
}
