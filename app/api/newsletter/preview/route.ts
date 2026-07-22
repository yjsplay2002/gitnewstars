import { NextResponse } from "next/server";
import { auth, ADMIN_EMAIL } from "@/auth";
import { getRedis } from "@/lib/redis";
import { composeDigest } from "@/lib/newsletter";
import { gmailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/** Admin-only: today's digest draft + subscriber count, for /admin/newsletter. */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const digest = await composeDigest();

  let subscribers: string[] = [];
  const redis = getRedis();
  if (redis) {
    try {
      subscribers = ((await redis.smembers("newsletter:subscribers")) as string[])
        .sort();
    } catch {
      // Count degrades to 0; the page shows a warning.
    }
  }

  return NextResponse.json({
    subject: digest.subject,
    // Preview keeps the placeholder visible instead of a live unsub link.
    html: digest.html.replaceAll("{{UNSUB_URL}}", "#unsubscribe-preview"),
    subscribers,
    gmailReady: gmailConfigured(),
  });
}
