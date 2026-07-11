/**
 * Free, open-source Claude Code / agent skills, ranked by GitHub stars. The
 * snapshot lives in data/skills.json (git-as-DB): the daily research routine
 * refreshes star counts and adds newly popular skills, then commits.
 */
import { readJson } from "./github";
import bundled from "@/data/skills.json";

export interface AgentSkill {
  id: string; // stable slug
  repo: string; // "owner/repo"
  author: string;
  category: string; // category key
  name: string;
  descKo: string;
  descEn: string;
  stars: number; // real GitHub stargazers count
  addedAt: string; // ISO — when curated in
}

export interface SkillsSnapshot {
  generatedAt: string;
  skills: AgentSkill[];
}

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export const SKILL_CATEGORIES: { key: string; ko: string; en: string }[] = [
  { key: "coding", ko: "코딩", en: "Coding" },
  { key: "writing", ko: "글쓰기", en: "Writing" },
  { key: "security", ko: "보안", en: "Security" },
  { key: "design", ko: "디자인", en: "Design" },
  { key: "automation", ko: "자동화", en: "Automation" },
  { key: "devops", ko: "데브옵스", en: "DevOps" },
  { key: "learning", ko: "학습", en: "Learning" },
  { key: "marketing", ko: "마케팅", en: "Marketing" },
  { key: "media", ko: "미디어", en: "Media" },
  { key: "finance", ko: "금융", en: "Finance" },
  { key: "collection", ko: "모음집", en: "Collections" },
];

/**
 * Current snapshot, most-starred first. Prefer the live data-repo file; fall
 * back to the bundled copy. Entries with a malformed "owner/repo" are dropped.
 */
export async function getSkills(): Promise<SkillsSnapshot> {
  const live = await readJson<SkillsSnapshot>("data/skills.json", 300);
  const snap = live ?? (bundled as SkillsSnapshot);
  const skills = (snap.skills ?? [])
    .filter((s) => s && typeof s.repo === "string" && REPO_RE.test(s.repo))
    .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  return { generatedAt: snap.generatedAt, skills };
}
