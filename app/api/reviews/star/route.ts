import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRedis } from "@/lib/redis";
import { REPO_RE, reviewsKey, toggleStar } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** POST { repo, reviewId } -> { starCount, starred } (requires sign-in, toggles) */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { repo?: string; reviewId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const repo = typeof body.repo === "string" ? body.repo : "";
  const reviewId = typeof body.reviewId === "string" ? body.reviewId : "";
  if (!REPO_RE.test(repo) || !reviewId) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const exists = await redis.hexists(reviewsKey(repo), reviewId);
  if (!exists) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const result = await toggleStar(redis, reviewId, email);
  return NextResponse.json(result);
}
