/**
 * Daily morning digest — composes one Korean HTML email from the same
 * bundled data files the site renders: curated AI news/use cases, YouTube
 * picks, agent skills, GitHub weekly trending, and fresh blog posts.
 *
 * Sending is handled by /api/newsletter/send (Resend HTTP API, no SDK);
 * subscribers live in the Upstash Redis set `newsletter:subscribers`
 * (see /api/subscribe). Unsubscribe links carry an HMAC token so the
 * /api/unsubscribe endpoint works without any login.
 */
import { createHmac, timingSafeEqual } from "crypto";
import curatedData from "@/data/curated-posts.json";
import videosData from "@/data/ai-videos.json";
import skillsData from "@/data/skills.json";
import { listArchivedWeeks, getArchivedWeek } from "./history";
import { listBlogPosts } from "./blog";
import { markdownExcerpt } from "./markdown";

export const SITE_URL = "https://gitnewstars.vercel.app";

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

export function newsletterSecret(): string {
  return cleanEnv(process.env.NEWSLETTER_CRON_SECRET);
}

/** HMAC token binding an email to the newsletter secret (for unsubscribe). */
export function unsubscribeToken(email: string): string {
  return createHmac("sha256", newsletterSecret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!newsletterSecret() || !/^[0-9a-f]{32}$/.test(token)) return false;
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clip(s: string, max: number): string {
  const text = s.replace(/\s+/g, " ").trim();
  return text.length <= max ? text : text.slice(0, max).trimEnd() + "…";
}

/** KST date label, e.g. "7월 22일 화요일". */
function kstDateLabel(now: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
}

/** KST calendar date key, e.g. "2026-07-22" — used for send dedup. */
export function kstDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/* ---------- section builders (inline-styled for email clients) ---------- */

const S = {
  section: "margin:28px 0 0;",
  h2: "margin:0 0 12px;font-size:16px;font-weight:700;color:#141413;",
  item: "margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #eae7de;",
  title:
    "font-size:14.5px;font-weight:700;color:#141413;text-decoration:none;line-height:1.45;",
  desc: "margin:4px 0 0;font-size:13px;line-height:1.6;color:#5f5c55;",
  meta: "margin:3px 0 0;font-size:11.5px;color:#9a968c;",
};

function sectionHtml(heading: string, itemsHtml: string): string {
  if (!itemsHtml) return "";
  return `<div style="${S.section}"><h2 style="${S.h2}">${heading}</h2>${itemsHtml}</div>`;
}

function itemHtml(
  url: string,
  title: string,
  desc: string,
  meta?: string
): string {
  return (
    `<div style="${S.item}">` +
    `<a href="${esc(url)}" style="${S.title}">${esc(title)}</a>` +
    (desc ? `<p style="${S.desc}">${esc(desc)}</p>` : "") +
    (meta ? `<p style="${S.meta}">${esc(meta)}</p>` : "") +
    `</div>`
  );
}

export interface Digest {
  subject: string;
  html: string;
  text: string;
}

/**
 * Compose today's digest. Pure function of the bundled data (plus the live
 * weekly snapshot + blog), so a redeploy with fresh data changes the email.
 */
export async function composeDigest(now = new Date()): Promise<Digest> {
  const posts = [...curatedData.posts]
    .sort((a, b) => String(b.curatedAt).localeCompare(String(a.curatedAt)))
    .slice(0, 4);
  const videos = [...videosData.videos]
    .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))
    .slice(0, 3);
  const skills = [...skillsData.skills]
    .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))
    .slice(0, 3);

  // Latest weekly GitHub trending snapshot (live from the data repo).
  let repos: {
    fullName: string;
    url: string;
    description: string | null;
    starsThisWeek: number;
  }[] = [];
  try {
    const [latest] = await listArchivedWeeks();
    const week = latest ? await getArchivedWeek(latest) : null;
    repos = (week?.repos ?? []).slice(0, 5);
  } catch {
    // Trending section is optional — never block the send.
  }

  // Blog posts from the last 3 days.
  let freshBlog: { slug: string; title: string; body: string }[] = [];
  try {
    const cutoff = new Date(now.getTime() - 3 * 86400_000).toISOString();
    freshBlog = (await listBlogPosts())
      .filter((p) => p.createdAt >= cutoff)
      .slice(0, 2);
  } catch {
    // Optional as well.
  }

  const newsHtml = posts
    .map((p) =>
      itemHtml(
        p.sourceUrl || `${SITE_URL}/posts`,
        p.title,
        clip(p.body, 140),
        p.sourceName
      )
    )
    .join("");
  const videoHtml = videos
    .map((v) =>
      itemHtml(
        `https://www.youtube.com/watch?v=${v.youtubeId}`,
        `▶ ${v.title}`,
        clip(v.descKo, 110),
        v.channel
      )
    )
    .join("");
  const skillHtml = skills
    .map((s) =>
      itemHtml(
        `https://github.com/${s.repo}`,
        s.name,
        clip(s.descKo, 110),
        s.repo
      )
    )
    .join("");
  const repoHtml = repos
    .map((r, i) =>
      itemHtml(
        r.url,
        `${i + 1}. ${r.fullName}`,
        clip(r.description ?? "", 110),
        `이번 주 +${r.starsThisWeek.toLocaleString("ko-KR")} 스타`
      )
    )
    .join("");
  const blogHtml = freshBlog
    .map((p) =>
      itemHtml(`${SITE_URL}/blog/${p.slug}`, p.title, markdownExcerpt(p.body, 120))
    )
    .join("");

  const dateLabel = kstDateLabel(now);
  const topTitle = posts[0]?.title ?? "오늘의 AI 코딩 브리핑";
  const subject = `☀️ ${dateLabel} 아침 브리핑 — ${clip(topTitle, 60)}`;

  const body =
    sectionHtml("📰 오늘의 AI 뉴스 & 유즈케이스", newsHtml) +
    sectionHtml("▶️ 볼만한 유튜브", videoHtml) +
    sectionHtml("🧩 주목할 에이전트 스킬", skillHtml) +
    sectionHtml("⭐ GitHub 주간 트렌딩 TOP 5", repoHtml) +
    sectionHtml("✍️ 새 블로그 글", blogHtml);

  // {{UNSUB_URL}} is replaced per-recipient at send time.
  const html =
    `<!doctype html><html lang="ko"><body style="margin:0;padding:0;background:#faf9f5;">` +
    `<div style="max-width:600px;margin:0 auto;padding:28px 20px 40px;` +
    `font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">` +
    `<p style="margin:0;font-size:12px;color:#9a968c;">${esc(dateLabel)}</p>` +
    `<h1 style="margin:6px 0 0;font-size:21px;color:#141413;">✳ GitNewStars 아침 브리핑</h1>` +
    `<p style="margin:8px 0 0;font-size:13px;color:#5f5c55;">` +
    `AI 코딩 뉴스·유튜브·스킬·GitHub 트렌딩을 매일 아침 정리해 드립니다.</p>` +
    body +
    `<div style="margin:32px 0 0;padding:16px 0 0;border-top:1px solid #eae7de;` +
    `font-size:11.5px;color:#9a968c;line-height:1.7;">` +
    `<a href="${SITE_URL}" style="color:#b8552f;">gitnewstars.vercel.app</a>에서 전체 콘텐츠를 볼 수 있습니다.<br/>` +
    `더 이상 받고 싶지 않으시면 <a href="{{UNSUB_URL}}" style="color:#9a968c;">구독 해지</a>를 눌러주세요.` +
    `</div></div></body></html>`;

  const text =
    `${dateLabel} — GitNewStars 아침 브리핑\n\n` +
    posts.map((p) => `- ${p.title}\n  ${p.sourceUrl ?? ""}`).join("\n") +
    `\n\n전체 보기: ${SITE_URL}\n구독 해지: {{UNSUB_URL}}`;

  return { subject, html, text };
}

/** Per-recipient unsubscribe URL, injected into the shared template. */
export function personalize(template: string, email: string): string {
  const url = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(
    email
  )}&token=${unsubscribeToken(email)}`;
  return template.replaceAll("{{UNSUB_URL}}", url);
}
