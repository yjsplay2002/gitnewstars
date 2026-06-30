import { getWeeklyTrending, type TrendingRepo } from "./trending";
import { translateAllToKorean } from "./translate";
import { readJson } from "./github";
import type { Overrides, RepoView } from "./types";

const OVERRIDES_PATH = "data/overrides.json";

/** Read admin overrides from the data repo (empty if unconfigured/missing). */
export async function getOverrides(): Promise<Overrides> {
  const data = await readJson<Overrides>(OVERRIDES_PATH, 60);
  return data ?? {};
}

/**
 * Build display rows from trending repos: attach an English description, a
 * Korean description (admin override if present, otherwise auto-translation),
 * and an `edited` flag.
 */
export async function buildRepoViews(
  repos: TrendingRepo[],
  overrides: Overrides
): Promise<RepoView[]> {
  // Translate only the repos that don't have an admin override.
  const needsTranslation = repos.map((r) => !overrides[r.fullName]);
  const koDrafts = await translateAllToKorean(
    repos.map((r, i) => (needsTranslation[i] ? r.description : ""))
  );

  return repos.map((r, i) => {
    const ov = overrides[r.fullName];
    return {
      ...r,
      descEn: r.description,
      descKo: ov?.descKo || koDrafts[i] || r.description,
      edited: Boolean(ov),
    };
  });
}

/** The current week's top 10, fully prepared for rendering. */
export async function getCurrentWeek(): Promise<RepoView[]> {
  const [repos, overrides] = await Promise.all([
    getWeeklyTrending(20),
    getOverrides(),
  ]);
  return buildRepoViews(repos, overrides);
}
