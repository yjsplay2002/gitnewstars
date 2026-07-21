import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, ADMIN_EMAIL } from "@/auth";
import { readJson, writeJson, getDataRepo } from "@/lib/github";
import {
  BLOG_PATH,
  BLOG_TITLE_MAX,
  BLOG_BODY_MAX,
  BLOG_TAG_MAX,
  BLOG_SLUG_RE,
  slugify,
  type BlogSnapshot,
  type BlogPost,
} from "@/lib/blog";

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getDataRepo() || !process.env.GH_TOKEN) {
    return NextResponse.json(
      { error: "Server is not configured for editing (GH_DATA_REPO/GH_TOKEN)." },
      { status: 500 }
    );
  }
  return null;
}

function refresh(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/feed.xml");
}

/** Admin-only: create or update a blog post. */
export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: {
    slug?: string;
    title?: string;
    body?: string;
    tags?: string[];
    published?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const markdown = (body.body ?? "").trim();
  const published = body.published !== false;
  const tags = (body.tags ?? [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, BLOG_TAG_MAX);

  if (!title || title.length > BLOG_TITLE_MAX) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }
  if (!markdown || markdown.length > BLOG_BODY_MAX) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim() || slugify(title);
  if (!BLOG_SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, digits and hyphens" },
      { status: 400 }
    );
  }

  const snapshot =
    (await readJson<BlogSnapshot>(BLOG_PATH, 0)) ?? ({ posts: [] } as BlogSnapshot);
  const now = new Date().toISOString();
  const existing = snapshot.posts.find((p) => p.slug === slug);

  if (existing) {
    existing.title = title;
    existing.body = markdown;
    existing.tags = tags;
    existing.published = published;
    existing.updatedAt = now;
  } else {
    const post: BlogPost = {
      slug,
      title,
      body: markdown,
      tags,
      createdAt: now,
      updatedAt: now,
      published,
    };
    snapshot.posts.push(post);
  }

  try {
    await writeJson(
      BLOG_PATH,
      snapshot,
      `blog: ${existing ? "update" : "add"} ${slug}`
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 502 }
    );
  }

  refresh(slug);
  return NextResponse.json({ ok: true, slug, updated: Boolean(existing) });
}

/** Admin-only: delete a post by slug (?slug=...). */
export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const slug = new URL(req.url).searchParams.get("slug") ?? "";
  if (!BLOG_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const snapshot = await readJson<BlogSnapshot>(BLOG_PATH, 0);
  if (!snapshot || !snapshot.posts.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  snapshot.posts = snapshot.posts.filter((p) => p.slug !== slug);

  try {
    await writeJson(BLOG_PATH, snapshot, `blog: delete ${slug}`);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 502 }
    );
  }

  refresh(slug);
  return NextResponse.json({ ok: true });
}
