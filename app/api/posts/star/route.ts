import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRedis } from "@/lib/redis";
import {
  CURATED_ID_RE,
  type StoredPost,
  getCuratedPosts,
  postsKey,
  togglePostStar,
} from "@/lib/posts";

export const dynamic = "force-dynamic";

/** POST { id } -> { starCount, weeklyStarCount, starred } (requires sign-in, toggles) */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  // Only real posts accumulate stars — otherwise the keyspace is spammable.
  if (CURATED_ID_RE.test(id)) {
    const snapshot = await getCuratedPosts();
    if (!snapshot.posts.some((p) => p.id === id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    const post = await redis.hget<StoredPost>(postsKey(), id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(await togglePostStar(redis, id, email));
}
