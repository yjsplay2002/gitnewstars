/**
 * Weekly snapshot generator — run by .github/workflows/snapshot.yml.
 *
 * Scrapes github.com/trending?since=weekly, translates each description to
 * Korean (applying any admin overrides from data/overrides.json), and writes
 * data/weeks/<isoWeek>.json. The workflow then commits the file, building up
 * the browsable weekly archive shown in the left sidebar.
 *
 * Self-contained (mirrors lib/trending + lib/translate + lib/week) so the
 * Action doesn't need a TypeScript build step.
 */
import * as cheerio from "cheerio";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function parseCount(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/,/g, "").trim().toLowerCase();
  const m = cleaned.match(/([\d.]+)\s*k?/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  return cleaned.includes("k") ? Math.round(v * 1000) : Math.round(v);
}

async function getTrending(limit = 10) {
  const res = await fetch("https://github.com/trending?since=weekly", {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  if (!res.ok) throw new Error(`trending fetch failed: ${res.status}`);
  const $ = cheerio.load(await res.text());
  const repos = [];

  $("article.Box-row").each((_, el) => {
    const a = $(el);
    const href = a.find("h2 a").attr("href") || "";
    const parts = href.split("/").filter(Boolean);
    if (parts.length < 2) return;
    const [owner, name] = parts;
    const description = a.find("p").first().text().trim();
    const language =
      a.find('[itemprop="programmingLanguage"]').first().text().trim() || null;
    const languageColor =
      a
        .find(".repo-language-color")
        .attr("style")
        ?.match(/#[0-9a-fA-F]{3,6}/)?.[0] ?? null;
    const totalStars = parseCount(
      a.find(`a[href="/${owner}/${name}/stargazers"]`).text()
    );
    const forks = parseCount(a.find(`a[href="/${owner}/${name}/forks"]`).text());
    const weekText = a.find("span.d-inline-block.float-sm-right").text().trim();
    const starsThisWeek = parseCount(weekText.match(/([\d,]+)/)?.[1]);

    repos.push({
      rank: 0,
      owner,
      name,
      fullName: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
      description,
      language,
      languageColor,
      totalStars,
      forks,
      starsThisWeek,
      avatarUrl: `https://github.com/${owner}.png?size=80`,
    });
  });

  return repos
    .sort((x, y) => y.starsThisWeek - x.starsThisWeek)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

async function translateToKorean(text) {
  const t = (text || "").trim();
  if (!t) return "";
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=" +
    encodeURIComponent(t);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return t;
    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) return t;
    return (
      data[0].map((s) => (Array.isArray(s) ? s[0] ?? "" : "")).join("").trim() ||
      t
    );
  } catch {
    return t;
  }
}

function isoWeekId(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const isoYear = d.getUTCFullYear();
  const ft = new Date(Date.UTC(isoYear, 0, 4));
  const ftDay = (ft.getUTCDay() + 6) % 7;
  ft.setUTCDate(ft.getUTCDate() - ftDay + 3);
  const week =
    1 + Math.round((d.getTime() - ft.getTime()) / (7 * 24 * 3600 * 1000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function label(weekId) {
  const m = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return weekId;
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const f = (x) => `${x.getUTCMonth() + 1}/${x.getUTCDate()}`;
  return `${year}년 ${week}주차 (${f(monday)}~${f(sunday)})`;
}

async function readOverrides() {
  try {
    return JSON.parse(await readFile("data/overrides.json", "utf-8"));
  } catch {
    return {};
  }
}

async function main() {
  // Snapshot the week that just ended (the workflow runs early Monday).
  const lastWeek = new Date();
  lastWeek.setUTCDate(lastWeek.getUTCDate() - 3);
  const weekId = isoWeekId(lastWeek);

  const [repos, overrides] = await Promise.all([
    getTrending(20),
    readOverrides(),
  ]);

  const out = [];
  for (const r of repos) {
    const ov = overrides[r.fullName];
    const descKo = ov?.descKo || (await translateToKorean(r.description));
    out.push({
      ...r,
      descEn: r.description,
      descKo: descKo || r.description,
      edited: Boolean(ov),
    });
  }

  const snapshot = {
    weekId,
    label: label(weekId),
    generatedAt: new Date().toISOString(),
    repos: out,
  };

  await mkdir("data/weeks", { recursive: true });
  await writeFile(
    `data/weeks/${weekId}.json`,
    JSON.stringify(snapshot, null, 2) + "\n",
    "utf-8"
  );
  console.log(`Wrote data/weeks/${weekId}.json (${out.length} repos)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
