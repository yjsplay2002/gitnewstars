/**
 * Blog posts — the operator's own long-form articles, distinct from the
 * community /posts feed. Git-as-DB: the whole blog lives in data/blog.json
 * (live copy read from the data repo via the Contents API, bundled copy as
 * fallback), written through /api/blog which commits via lib/github.
 */
import { readJson } from "./github";
import bundled from "@/data/blog.json";

export const BLOG_PATH = "data/blog.json";
export const BLOG_TITLE_MAX = 150;
export const BLOG_BODY_MAX = 50_000;
export const BLOG_TAG_MAX = 5;

export interface BlogPost {
  slug: string;
  title: string;
  body: string; // markdown
  /** Optional English edition (a re-write, not a literal translation).
   *  When present the post is also served at /blog/<slug>/en with
   *  reciprocal hreflang — one post, two citable language versions (GEO). */
  titleEn?: string;
  bodyEn?: string;
  tags: string[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  published: boolean;
}

export interface BlogSnapshot {
  posts: BlogPost[];
}

export const BLOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Derive a slug from a title: ascii words kept, everything else dropped. */
export function slugify(title: string): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
  // Korean-only titles produce an empty ascii slug — fall back to a date id.
  return ascii || `post-${new Date().toISOString().slice(0, 10)}`;
}

/** Live blog file when configured, bundled copy otherwise. */
export async function getBlog(revalidate = 300): Promise<BlogSnapshot> {
  const live = await readJson<BlogSnapshot>(BLOG_PATH, revalidate);
  return live ?? (bundled as BlogSnapshot);
}

/** Published posts, newest first. */
export async function listBlogPosts(): Promise<BlogPost[]> {
  const snapshot = await getBlog();
  return snapshot.posts
    .filter((p) => p.published)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const snapshot = await getBlog();
  return snapshot.posts.find((p) => p.slug === slug && p.published) ?? null;
}

/** Bundled slugs — for generateStaticParams / sitemap. */
export function listBundledBlogSlugs(): string[] {
  return (bundled as BlogSnapshot).posts.filter((p) => p.published).map((p) => p.slug);
}

/** Bundled slugs that ship an English edition — for /blog/<slug>/en. */
export function listBundledBlogSlugsEn(): string[] {
  return (bundled as BlogSnapshot).posts
    .filter((p) => p.published && p.titleEn && p.bodyEn)
    .map((p) => p.slug);
}

export function hasEnglish(post: BlogPost): boolean {
  return Boolean(post.titleEn && post.bodyEn);
}
