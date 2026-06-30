import { listDir, readJson } from "./github";
import type { WeekSnapshot } from "./types";

const WEEKS_DIR = "data/weeks";

/** All archived week ids, newest first (e.g. ["2026-W27", "2026-W26"]). */
export async function listArchivedWeeks(): Promise<string[]> {
  const ids = await listDir(WEEKS_DIR, 300);
  return ids.sort().reverse();
}

/** Load a single archived week snapshot, or null if it doesn't exist. */
export async function getArchivedWeek(
  weekId: string
): Promise<WeekSnapshot | null> {
  if (!/^\d{4}-W\d{2}$/.test(weekId)) return null;
  return readJson<WeekSnapshot>(`${WEEKS_DIR}/${weekId}.json`, 300);
}
