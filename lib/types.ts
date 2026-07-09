import type { TrendingRepo } from "./trending";

/** A repo as shown in the UI: trending data + English/Korean descriptions. */
export interface RepoView extends TrendingRepo {
  descEn: string;
  descKo: string;
  /** Admin "why it trended" blurb (Korean). Absent when not curated. */
  whyKo?: string;
  /** true when descKo came from an admin edit rather than auto-translation. */
  edited: boolean;
}

/** data/overrides.json — admin edits keyed by "owner/repo". */
export type Overrides = Record<
  string,
  { descKo: string; whyKo?: string; updatedAt: string; updatedBy: string }
>;

/** data/weeks/<weekId>.json — an archived weekly snapshot. */
export interface WeekSnapshot {
  weekId: string; // e.g. "2026-W27"
  label: string; // e.g. "2026년 27주차 (6/29~7/5)"
  generatedAt: string; // ISO timestamp
  repos: RepoView[];
}
