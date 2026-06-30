import * as cheerio from "cheerio";

export interface TrendingRepo {
  rank: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string | null;
  languageColor: string | null;
  totalStars: number;
  forks: number;
  starsThisWeek: number;
  avatarUrl: string;
}

const TRENDING_URL = "https://github.com/trending?since=weekly";

/** Parse a GitHub-formatted number string like "1,234" or "12.3k" into an integer. */
function parseCount(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, "").trim().toLowerCase();
  const match = cleaned.match(/([\d.]+)\s*k?/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  return cleaned.includes("k") ? Math.round(value * 1000) : Math.round(value);
}

/**
 * Scrape github.com/trending?since=weekly, returning repositories sorted by
 * stars gained this week (descending), limited to `limit` entries.
 */
export async function getWeeklyTrending(limit = 10): Promise<TrendingRepo[]> {
  const res = await fetch(TRENDING_URL, {
    headers: {
      // A desktop UA keeps GitHub from serving a stripped-down page.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "text/html",
    },
    // Cache the upstream fetch for 1 hour (ISR-friendly, free-tier safe).
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`GitHub trending request failed: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const repos: TrendingRepo[] = [];

  $("article.Box-row").each((_, el) => {
    const article = $(el);

    // "owner / repo" lives in the h2 anchor's href: /owner/repo
    const href = article.find("h2 a").attr("href") || "";
    const parts = href.split("/").filter(Boolean);
    if (parts.length < 2) return;
    const owner = parts[0];
    const name = parts[1];

    const description = article
      .find("p")
      .first()
      .text()
      .trim();

    const language =
      article.find('[itemprop="programmingLanguage"]').first().text().trim() ||
      null;
    const languageColor =
      article.find(".repo-language-color").attr("style")?.match(/#[0-9a-fA-F]{3,6}/)?.[0] ??
      article
        .find(".repo-language-color")
        .attr("style")
        ?.replace("background-color:", "")
        .trim() ??
      null;

    // The two counter links (stars, forks) carry aria/title-free text;
    // grab them by their href suffix.
    const totalStars = parseCount(
      article.find(`a[href="/${owner}/${name}/stargazers"]`).text()
    );
    const forks = parseCount(
      article.find(`a[href="/${owner}/${name}/forks"]`).text()
    );

    // "123 stars this week" sits in the bottom-right float span.
    const weekText = article
      .find("span.d-inline-block.float-sm-right")
      .text()
      .trim();
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
    .sort((a, b) => b.starsThisWeek - a.starsThisWeek)
    .slice(0, limit)
    .map((repo, i) => ({ ...repo, rank: i + 1 }));
}
