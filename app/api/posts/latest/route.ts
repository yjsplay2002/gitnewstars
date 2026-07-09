import { NextResponse } from "next/server";
import { getCuratedPosts } from "@/lib/posts";

// Cheap "is there new content?" probe for the tab badge. Reads only the
// curated JSON (file-cached ~5 min), never Redis, so every page can poll it.
export const revalidate = 300;

/** GET -> { latest } — newest curatedAt/createdAt across curated posts (ISO, or ""). */
export async function GET() {
  const { posts } = await getCuratedPosts();
  const latest = posts.reduce((max, p) => {
    const t = p.curatedAt || p.createdAt || "";
    return t > max ? t : max;
  }, "");
  return NextResponse.json({ latest });
}
