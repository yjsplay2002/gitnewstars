import { NextResponse } from "next/server";
import { auth, ADMIN_EMAIL } from "@/auth";
import { getRedis } from "@/lib/redis";
import {
  POST_BODY_MAX_LEN,
  POST_TITLE_MAX_LEN,
  POST_URL_MAX_LEN,
  type StoredPost,
  detectMediaType,
  listPosts,
  postStarsKey,
  postWeeklyStarsKey,
  postsKey,
  toPostView,
} from "@/lib/posts";
import { commentsKey, reviewsKey } from "@/lib/reviews";
import { isoWeekId } from "@/lib/week";

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

/** GET -> { posts: PostView[], weekId } — newest first, with weekly star counts. */
export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ posts: [], weekId: isoWeekId() });
  const { email } = await viewer();
  return NextResponse.json({ posts: await listPosts(redis, email), weekId: isoWeekId() });
}

/** POST { title, body, mediaUrl? } -> { post: PostView } (requires sign-in) */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const user = await viewer();
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; body?: string; mediaUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  if (!title || title.length > POST_TITLE_MAX_LEN) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }
  if (!text || text.length > POST_BODY_MAX_LEN) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }
  if (mediaUrl && (mediaUrl.length > POST_URL_MAX_LEN || !/^https?:\/\//i.test(mediaUrl))) {
    return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
  }

  // Light anti-spam: shares the UGC cooldown with reviews/comments.
  const fresh = await redis.set(`rl:ugc:${user.email}`, "1", {
    nx: true,
    ex: POST_COOLDOWN_SECONDS,
  });
  if (fresh !== "OK") return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const post: StoredPost = {
    id: crypto.randomUUID(),
    authorName: user.name,
    authorImage: user.image,
    authorEmail: user.email,
    title,
    body: text,
    mediaType: detectMediaType(mediaUrl),
    mediaUrl,
    createdAt: new Date().toISOString(),
  };
  await redis.hset(postsKey(), { [post.id]: post });

  return NextResponse.json({ post: toPostView(post, user.email, 0, 0, false) });
}

/** DELETE ?id= — author or admin only. Removes the post, its stars, and its reviews. */
export async function DELETE(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const user = await viewer();
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  const post = await redis.hget<StoredPost>(postsKey(), id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorEmail !== user.email && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reviews attached to this post live under the "posts/<id>" pseudo-repo.
  const attachedReviews = await redis.hkeys(reviewsKey(`posts/${id}`));
  await Promise.all([
    redis.hdel(postsKey(), id),
    redis.del(postStarsKey(id)),
    redis.del(postWeeklyStarsKey(id)),
    redis.del(reviewsKey(`posts/${id}`)),
    ...attachedReviews.map((rid) => redis.del(commentsKey(rid))),
  ]);
  return NextResponse.json({ ok: true });
}
