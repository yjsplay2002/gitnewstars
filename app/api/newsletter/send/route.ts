import { NextResponse } from "next/server";
import { auth, ADMIN_EMAIL } from "@/auth";
import { getRedis } from "@/lib/redis";
import { composeDigest, personalize } from "@/lib/newsletter";
import { sendViaGmail, gmailConfigured } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/newsletter/send — admin pressed "발송" on /admin/newsletter.
 * Composes today's digest and sends it to every subscriber via the
 * operator's own Gmail (App Password SMTP). No auto-cron: every send is an
 * explicit human approval.
 */
export async function POST() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!gmailConfigured()) {
    return NextResponse.json(
      { error: "GMAIL_USER / GMAIL_APP_PASSWORD가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Redis가 설정되지 않아 구독자 목록을 읽을 수 없습니다." },
      { status: 500 }
    );
  }

  const subscribers = (await redis.smembers("newsletter:subscribers")) as string[];
  if (!subscribers.length) {
    return NextResponse.json({ ok: true, sent: 0, note: "구독자가 없습니다." });
  }

  const digest = await composeDigest();
  const { sent, failed } = await sendViaGmail(
    subscribers.map((to) => ({
      to,
      subject: digest.subject,
      html: personalize(digest.html, to),
      text: personalize(digest.text, to),
    }))
  );

  return NextResponse.json({
    ok: failed.length === 0,
    sent,
    failed,
    subject: digest.subject,
  });
}
