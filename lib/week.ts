/** ISO-8601 week helpers (Monday-based), used for history archive keys. */

/** Returns the ISO week id like "2026-W27" for a given date (default: now). */
export function isoWeekId(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  // Thursday of the current week decides the ISO year.
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000)
    );
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Monday (start) date of a given ISO week id. */
export function mondayOfIsoWeek(weekId: string): Date {
  const m = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return new Date(NaN);
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

function fmt(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** Human label, localized. e.g. "2026 · Week 27 (6/29–7/5)". */
export function weekLabel(weekId: string, lang: "ko" | "en"): string {
  const m = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return weekId;
  const year = m[1];
  const week = Number(m[2]);
  const monday = mondayOfIsoWeek(weekId);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const range = `${fmt(monday)}~${fmt(sunday)}`;
  return lang === "ko"
    ? `${year}년 ${week}주차 (${range})`
    : `${year} · Week ${week} (${range})`;
}
