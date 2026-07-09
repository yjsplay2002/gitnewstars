/**
 * Pure text/markdown builder for a weekly share draft.
 * No auto-send — admin copy-paste only.
 */
import type { CuratedPost } from "./posts";
import type { RepoView } from "./types";
import { isoWeekId, weekLabel } from "./week";

const SITE_URL = "https://gitnewstars.vercel.app";

export interface WeeklyReportOptions {
  /** Max trending repos to include (default 10). */
  topN?: number;
  /** Max curated posts to include (default 5). */
  postsN?: number;
  /** ISO week id override; default current week. */
  weekId?: string;
  lang?: "ko" | "en";
}

function fmtStars(n: number): string {
  return n.toLocaleString("en-US");
}

function excerpt(body: string, max = 120): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/**
 * Build a markdown weekly report from trending repos + curated posts.
 * Suitable for X/Threads/Slack paste.
 */
export function buildWeeklyReport(
  repos: Pick<RepoView, "rank" | "fullName" | "url" | "starsThisWeek" | "descKo" | "descEn">[],
  posts: Pick<CuratedPost, "id" | "title" | "titleEn" | "body" | "bodyEn" | "sourceName">[],
  opts: WeeklyReportOptions = {}
): string {
  const topN = opts.topN ?? 10;
  const postsN = opts.postsN ?? 5;
  const lang = opts.lang ?? "ko";
  const weekId = opts.weekId ?? isoWeekId();
  const label = weekLabel(weekId, lang);

  const top = repos.slice(0, topN);
  const recent = posts.slice(0, postsN);

  if (lang === "en") {
    const lines: string[] = [
      `# GitNewStars weekly — ${label}`,
      "",
      `Korean AI-coding briefing · ${SITE_URL}`,
      "",
      `## Trending GitHub TOP ${top.length}`,
      "",
    ];
    for (const r of top) {
      const desc = (r.descEn || r.descKo || "").replace(/\s+/g, " ").trim();
      lines.push(
        `${r.rank}. **${r.fullName}** ⭐${fmtStars(r.starsThisWeek)} — ${excerpt(desc, 80)}`
      );
      lines.push(`   ${r.url}`);
    }
    lines.push("", `## Recent curated posts (${recent.length})`, "");
    if (recent.length === 0) {
      lines.push("_No curated posts yet._");
    } else {
      for (const p of recent) {
        const title = p.titleEn || p.title;
        lines.push(`- **${title}** (${p.sourceName})`);
        lines.push(`  ${SITE_URL}/posts/${p.id}`);
        lines.push(`  ${excerpt(p.bodyEn || p.body, 100)}`);
      }
    }
    lines.push("", `— ${SITE_URL}`, "");
    return lines.join("\n");
  }

  const lines: string[] = [
    `# GitNewStars 주간 리포트 — ${label}`,
    "",
    `한국어 AI 코딩 브리핑 · ${SITE_URL}`,
    "",
    `## GitHub 트렌딩 TOP ${top.length}`,
    "",
  ];
  for (const r of top) {
    const desc = (r.descKo || r.descEn || "").replace(/\s+/g, " ").trim();
    lines.push(
      `${r.rank}. **${r.fullName}** ⭐${fmtStars(r.starsThisWeek)} — ${excerpt(desc, 80)}`
    );
    lines.push(`   ${r.url}`);
  }
  lines.push("", `## 최근 큐레이션 글 (${recent.length})`, "");
  if (recent.length === 0) {
    lines.push("_아직 큐레이션 글이 없습니다._");
  } else {
    for (const p of recent) {
      lines.push(`- **${p.title}** (${p.sourceName})`);
      lines.push(`  ${SITE_URL}/posts/${p.id}`);
      lines.push(`  ${excerpt(p.body, 100)}`);
    }
  }
  lines.push("", `— ${SITE_URL}`, "");
  return lines.join("\n");
}
