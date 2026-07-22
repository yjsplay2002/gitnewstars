import { getRedis } from "@/lib/redis";
import { verifyUnsubscribeToken, SITE_URL } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

function page(title: string, message: string, status = 200): Response {
  const html =
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>` +
    `<meta name="viewport" content="width=device-width, initial-scale=1"/>` +
    `<meta name="robots" content="noindex"/><title>${title} | GitNewStars</title></head>` +
    `<body style="margin:0;background:#faf9f5;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">` +
    `<div style="max-width:480px;margin:15vh auto 0;padding:32px 24px;text-align:center;">` +
    `<h1 style="font-size:22px;color:#141413;margin:0 0 12px;">${title}</h1>` +
    `<p style="font-size:14px;color:#5f5c55;line-height:1.7;margin:0 0 24px;">${message}</p>` +
    `<a href="${SITE_URL}" style="font-size:13.5px;color:#b8552f;">GitNewStars 홈으로 →</a>` +
    `</div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** GET /api/unsubscribe?email=...&token=... — one-click, no login. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("token") ?? "";

  if (!email || !verifyUnsubscribeToken(email, token)) {
    return page(
      "잘못된 링크입니다",
      "구독 해지 링크가 만료되었거나 올바르지 않습니다. 받으신 메일의 링크를 다시 확인해 주세요.",
      400
    );
  }

  const redis = getRedis();
  if (redis) {
    try {
      await redis.srem("newsletter:subscribers", email);
    } catch {
      return page(
        "잠시 후 다시 시도해 주세요",
        "일시적인 오류로 처리하지 못했습니다.",
        500
      );
    }
  }

  return page(
    "구독이 해지되었습니다",
    "더 이상 아침 브리핑 메일이 발송되지 않습니다. 언제든 다시 구독하실 수 있습니다."
  );
}
