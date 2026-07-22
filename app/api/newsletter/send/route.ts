import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import {
  composeDigest,
  personalize,
  newsletterSecret,
  kstDateKey,
} from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const BATCH_SIZE = 100;

/**
 * POST /api/newsletter/send — send today's digest to every subscriber.
 * Called by the daily GitHub Actions cron (09:30 KST) with
 * `Authorization: Bearer $NEWSLETTER_CRON_SECRET`.
 *
 * Guards: shared-secret auth, one send per KST calendar day (Redis NX lock,
 * bypass with ?force=1 for manual re-runs).
 */
export async function POST(req: Request) {
  const secret = newsletterSecret();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  const from =
    cleanEnv(process.env.NEWSLETTER_FROM) || "GitNewStars <onboarding@resend.dev>";
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Redis is not configured" },
      { status: 500 }
    );
  }

  const force = new URL(req.url).searchParams.get("force") === "1";
  const dateKey = kstDateKey(new Date());
  if (!force) {
    const locked = await redis.set(`newsletter:sent:${dateKey}`, "1", {
      nx: true,
      ex: 2 * 86400,
    });
    if (locked === null) {
      return NextResponse.json({ ok: true, skipped: "already sent today" });
    }
  }

  const subscribers = (await redis.smembers("newsletter:subscribers")) as string[];
  if (!subscribers.length) {
    return NextResponse.json({ ok: true, sent: 0, note: "no subscribers" });
  }

  const digest = await composeDigest();
  let sent = 0;
  const failed: string[] = [];

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const chunk = subscribers.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((email) => ({
      from,
      to: [email],
      subject: digest.subject,
      html: personalize(digest.html, email),
      text: personalize(digest.text, email),
    }));

    try {
      const res = await fetch(RESEND_BATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        sent += chunk.length;
      } else {
        failed.push(...chunk);
        console.error("resend batch failed", res.status, await res.text());
      }
    } catch (e) {
      failed.push(...chunk);
      console.error("resend batch error", e);
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    sent,
    failed: failed.length,
    subject: digest.subject,
  });
}
