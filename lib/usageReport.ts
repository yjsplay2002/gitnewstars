/**
 * Structured usage-report (사용기) helpers.
 * Serializes form fields into the existing user-post body (markdown sections).
 * No new storage — reuse /api/posts + Redis posts hash.
 */
import { POST_BODY_MAX_LEN, POST_TITLE_MAX_LEN } from "./posts";

export interface UsageReportFields {
  tool: string;
  problem: string;
  effect: string;
  failure?: string;
  codePrompt?: string;
}

const SECTION = {
  tool: "도구",
  problem: "무슨 문제",
  effect: "효과",
  failure: "실패·주의점",
  codePrompt: "코드·프롬프트",
} as const;

/** Build a short title from tool + problem summary. */
export function usageReportTitle(fields: UsageReportFields): string {
  const tool = fields.tool.trim();
  const problem = fields.problem.trim().replace(/\s+/g, " ");
  const base = tool ? `${tool} 사용기` : "사용기";
  if (!problem) return base.slice(0, POST_TITLE_MAX_LEN);
  const rest = POST_TITLE_MAX_LEN - base.length - 3; // " — "
  if (rest < 8) return base.slice(0, POST_TITLE_MAX_LEN);
  const snippet = problem.length > rest ? problem.slice(0, rest - 1) + "…" : problem;
  return `${base} — ${snippet}`.slice(0, POST_TITLE_MAX_LEN);
}

/**
 * Serialize structured fields into a markdown body for StoredPost.body.
 * Truncates optional sections if over POST_BODY_MAX_LEN.
 */
export function serializeUsageReport(fields: UsageReportFields): string {
  const tool = fields.tool.trim();
  const problem = fields.problem.trim();
  const effect = fields.effect.trim();
  const failure = (fields.failure ?? "").trim();
  const codePrompt = (fields.codePrompt ?? "").trim();

  const parts: string[] = [
    `## ${SECTION.tool}`,
    tool,
    "",
    `## ${SECTION.problem}`,
    problem,
    "",
    `## ${SECTION.effect}`,
    effect,
  ];

  if (failure) {
    parts.push("", `## ${SECTION.failure}`, failure);
  }
  if (codePrompt) {
    parts.push("", `## ${SECTION.codePrompt}`, "```", codePrompt, "```");
  }

  let body = parts.join("\n");
  if (body.length > POST_BODY_MAX_LEN) {
    body = body.slice(0, POST_BODY_MAX_LEN);
  }
  return body;
}

/** Required fields present? */
export function isUsageReportValid(fields: UsageReportFields): boolean {
  return Boolean(fields.tool.trim() && fields.problem.trim() && fields.effect.trim());
}
