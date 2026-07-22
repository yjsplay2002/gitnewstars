import type { MetadataRoute } from "next";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { listToolSlugs } from "@/lib/aiTools";
import { listBundledBlogSlugs, listBundledBlogSlugsEn } from "@/lib/blog";
import { listBundledCuratedIds } from "@/lib/posts";
import { listTopics } from "@/lib/topics";

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
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/models`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
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
    {
      url: `${SITE_URL}/topics`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/feed.xml`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.6,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = listBundledBlogSlugs().map((slug) => ({
    url: `${SITE_URL}/blog/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const blogEnRoutes: MetadataRoute.Sitemap = listBundledBlogSlugsEn().map(
    (slug) => ({
      url: `${SITE_URL}/blog/${slug}/en`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.75,
    })
  );

  const postRoutes: MetadataRoute.Sitemap = listBundledCuratedIds().map((id) => ({
    url: `${SITE_URL}/posts/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const topicRoutes: MetadataRoute.Sitemap = listTopics().map((t) => ({
    url: `${SITE_URL}/topics/${t.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.75,
  }));

  const toolRoutes: MetadataRoute.Sitemap = listToolSlugs().map((slug) => ({
    url: `${SITE_URL}/tools/${slug}`,
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

  return [
    ...staticRoutes,
    ...blogRoutes,
    ...blogEnRoutes,
    ...postRoutes,
    ...topicRoutes,
    ...toolRoutes,
    ...weekRoutes,
  ];
}
