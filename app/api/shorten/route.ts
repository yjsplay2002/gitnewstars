import { NextResponse } from "next/server";

/**
 * Shorten GitHub project URLs via the free is.gd API (server-side to avoid
 * CORS). Each unique URL is cached for a day. On any failure the original URL
 * is returned unchanged, so sharing always works.
 *
 * Body: { urls: string[] }  ->  { short: string[] }  (same order)
 */
async function shorten(url: string): Promise<string> {
  // Only shorten github.com links — don't proxy arbitrary URLs.
  if (!/^https:\/\/github\.com\//.test(url)) return url;
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return url;
    const text = (await res.text()).trim();
    return text.startsWith("http") ? text : url;
  } catch {
    return url;
  }
}

export async function POST(req: Request) {
  let body: { urls?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u): u is string => typeof u === "string").slice(0, 30)
    : [];

  const short = await Promise.all(urls.map(shorten));
  return NextResponse.json({ short });
}
