import type { MetadataRoute } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { listBundledCuratedIds } from "@/lib/posts";

const SITE_URL = "https://gitnewstars.vercel.app";

/** Week archive ids from the bundled data/weeks/*.json files. */
function listBundledWeekIds(): string[] {
  try {
    const dir = join(process.cwd(), "data", "weeks");
    return readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
    {
      url: `${SITE_URL}/posts`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const postRoutes: MetadataRoute.Sitemap = listBundledCuratedIds().map((id) => ({
    url: `${SITE_URL}/posts/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const weekRoutes: MetadataRoute.Sitemap = listBundledWeekIds().map((week) => ({
    url: `${SITE_URL}/week/${week}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...postRoutes, ...weekRoutes];
}
