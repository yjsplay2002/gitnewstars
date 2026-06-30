/**
 * Lightweight English→Korean translation using Google's free (unofficial)
 * translate endpoint. Used only to produce a *draft* Korean description for
 * each project; the admin can refine any of them via the in-app editor.
 *
 * Failures degrade gracefully to the original English text — the site never
 * breaks just because translation is unavailable or rate-limited.
 */

const ENDPOINT = "https://translate.googleapis.com/translate_a/single";

/** Translate a single short string to Korean. Returns the input on failure. */
export async function translateToKorean(text: string): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed) return "";

  const url =
    `${ENDPOINT}?client=gtx&sl=en&tl=ko&dt=t&q=` +
    encodeURIComponent(trimmed);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      // Cache each translation for a day; identical descriptions across hourly
      // regenerations reuse the cached result instead of re-calling Google.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return trimmed;

    // Response shape: [[["translated","original",...], ...], ...]
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return trimmed;
    const segments = data[0] as unknown[];
    const joined = segments
      .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
      .join("");
    return joined.trim() || trimmed;
  } catch {
    return trimmed;
  }
}

/** Translate many strings concurrently (order preserved). */
export async function translateAllToKorean(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map((t) => translateToKorean(t)));
}
