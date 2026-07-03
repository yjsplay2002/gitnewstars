import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 60_000; // "online" = a heartbeat within the last 60s
const TODAY_TTL_SECONDS = 60 * 60 * 26; // a little over a day, covers the KST offset
const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/** Bucket "today" by KST (UTC+9) since this is a Korean-first site. */
function todayKeyKST(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function counts(redis: Redis, visitorId?: string) {
  const now = Date.now();
  const todayKey = `visitors:today:${todayKeyKST()}`;

  if (visitorId) {
    await Promise.all([
      redis.sadd("visitors:total", visitorId),
      redis.sadd(todayKey, visitorId),
      redis.expire(todayKey, TODAY_TTL_SECONDS),
      redis.zadd("visitors:online", { score: now, member: visitorId }),
    ]);
  }

  await redis.zremrangebyscore("visitors:online", 0, now - ONLINE_WINDOW_MS);
  const [online, today, total] = await Promise.all([
    redis.zcard("visitors:online"),
    redis.scard(todayKey),
    redis.scard("visitors:total"),
  ]);
  return { online, today, total };
}

/** Register/refresh a visit and return live counts. Body: { visitorId: string } */
export async function POST(req: Request) {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ online: 0, today: 0, total: 0 });

  let body: { visitorId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* no body — treat as a plain read */
  }
  const visitorId =
    typeof body.visitorId === "string" && VISITOR_ID_RE.test(body.visitorId)
      ? body.visitorId
      : undefined;

  return NextResponse.json(await counts(redis, visitorId));
}

/** Read-only: current counts without registering a visit. */
export async function GET() {
  const redis = getRedis();
  if (!redis) return NextResponse.json({ online: 0, today: 0, total: 0 });
  return NextResponse.json(await counts(redis));
}
