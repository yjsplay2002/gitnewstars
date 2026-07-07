import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRedis } from "@/lib/redis";
import { TOOL_SLUG_RE } from "@/lib/aiTools";

export const dynamic = "force-dynamic";

const toolStarsKey = (slug: string) => `tool-stars:${slug}`;

async function viewerEmail(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email?.toLowerCase() ?? null;
}

/**
 * GET ?counts=slug1,slug2 -> { counts: { slug: n }, starred: { slug: boolean } }
 * (starred is all-false when signed out)
 */
export async function GET(req: Request) {
  const redis = getRedis();
  const { searchParams } = new URL(req.url);
  const slugs = (searchParams.get("counts") ?? "")
    .split(",")
    .filter((s) => TOOL_SLUG_RE.test(s))
    .slice(0, 100);
  if (!redis || slugs.length === 0) {
    return NextResponse.json({ counts: {}, starred: {} });
  }

  const email = await viewerEmail();
  const [counts, flags] = await Promise.all([
    Promise.all(slugs.map((s) => redis.scard(toolStarsKey(s)))),
    email
      ? Promise.all(slugs.map((s) => redis.sismember(toolStarsKey(s), email)))
      : Promise.resolve(slugs.map(() => false)),
  ]);

  return NextResponse.json({
    counts: Object.fromEntries(slugs.map((s, i) => [s, counts[i]])),
    starred: Object.fromEntries(slugs.map((s, i) => [s, Boolean(flags[i])])),
  });
}

/** POST { slug } -> { starCount, starred } (requires sign-in, toggles) */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

  const email = await viewerEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { slug?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!TOOL_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const key = toolStarsKey(slug);
  const already = await redis.sismember(key, email);
  if (already) {
    await redis.srem(key, email);
  } else {
    await redis.sadd(key, email);
  }
  const starCount = await redis.scard(key);
  return NextResponse.json({ starCount, starred: !already });
}
