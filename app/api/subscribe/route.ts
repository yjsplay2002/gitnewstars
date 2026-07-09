import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/** Practical email check — not full RFC; enough for a scaffold form. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

function isNewsletterEnvConfigured(): boolean {
  return Boolean(
    cleanEnv(process.env.NEWSLETTER_API_URL) &&
      cleanEnv(process.env.NEWSLETTER_API_KEY)
  );
}

/**
 * Guarded hook for an external newsletter provider.
 * Active only when NEWSLETTER_API_URL + NEWSLETTER_API_KEY are both set.
 *
 * TODO(newsletter-provider): Replace the request body/headers below with the
 * chosen provider's API shape (Buttondown, Resend Contacts, ConvertKit, …).
 * Do NOT hardcode a specific vendor SDK or endpoint path here — keep this a
 * thin env-driven POST until a real provider is wired up.
 */
async function forwardToNewsletterService(email: string): Promise<boolean> {
  const url = cleanEnv(process.env.NEWSLETTER_API_URL);
  const apiKey = cleanEnv(process.env.NEWSLETTER_API_KEY);
  if (!url || !apiKey) return false;

  try {
    // TODO(newsletter-provider): adjust method/headers/body for the provider.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  } catch {
    // Network / provider outage must not break the site — fall through.
    return false;
  }
}

/**
 * POST { email: string }
 *
 * Priority:
 *  1. NEWSLETTER_* env → forward via guarded provider hook
 *  2. Upstash Redis → SADD newsletter:subscribers
 *  3. Neither → graceful 200 "pending" (준비 중). Never 501 / never throw.
 */
export async function POST(req: Request) {
  let body: { email?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_email" },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid_email" },
      { status: 400 }
    );
  }

  // 1) External provider (env-gated)
  if (isNewsletterEnvConfigured()) {
    const forwarded = await forwardToNewsletterService(email);
    if (forwarded) {
      return NextResponse.json({ ok: true, status: "subscribed" });
    }
    // Provider failed — try Redis fallback before giving up.
  }

  // 2) Redis set fallback
  const redis = getRedis();
  if (redis) {
    try {
      await redis.sadd("newsletter:subscribers", email);
      return NextResponse.json({ ok: true, status: "stored" });
    } catch {
      // Redis error must not crash — fall through to pending.
    }
  }

  // 3) Nothing configured (or both paths failed) — graceful "준비 중"
  return NextResponse.json({
    ok: true,
    status: "pending",
    message: "준비 중",
  });
}
