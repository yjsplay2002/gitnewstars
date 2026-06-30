/**
 * Thin wrapper over the GitHub Contents API. The repository acts as the
 * single source of truth for two kinds of data:
 *   - data/overrides.json        admin-edited Korean descriptions
 *   - data/weeks/<week>.json      weekly top-10 snapshots (history archive)
 *
 * Reads are unauthenticated when possible (public repo) and cached; writes
 * require GH_TOKEN. If GH_DATA_REPO is not configured, every helper degrades
 * gracefully (reads return empty, writes throw a clear error) so the rest of
 * the app keeps working.
 */

const API = "https://api.github.com";

/**
 * Keep only printable ASCII. Windows shells frequently prepend a UTF-8 BOM
 * (U+FEFF) when a secret is piped into another process; left in place it
 * corrupts HTTP header values and URLs (e.g. "Bearer ﻿ghp_..."). Tokens
 * and "owner/repo" strings are pure printable ASCII, so this is safe.
 */
function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

export function getDataRepo(): { owner: string; repo: string } | null {
  const full = cleanEnv(process.env.GH_DATA_REPO); // "owner/repo"
  if (!full.includes("/")) return null;
  const [owner, repo] = full.split("/");
  return owner && repo ? { owner, repo } : null;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = cleanEnv(process.env.GH_TOKEN);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function decodeBase64(b64: string): string {
  return Buffer.from(b64.replace(/\n/g, ""), "base64").toString("utf-8");
}

function encodeBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

/** Read and parse a JSON file from the data repo. Returns null if absent. */
export async function readJson<T>(
  path: string,
  revalidate = 300
): Promise<T | null> {
  const repo = getDataRepo();
  if (!repo) return null;

  try {
    const res = await fetch(
      `${API}/repos/${repo.owner}/${repo.repo}/contents/${path}`,
      { headers: authHeaders(), next: { revalidate } }
    );
    if (!res.ok) return null;

    const json = (await res.json()) as { content?: string };
    if (!json.content) return null;
    return JSON.parse(decodeBase64(json.content)) as T;
  } catch {
    return null;
  }
}

/** List file names (without extension) inside a directory of the data repo. */
export async function listDir(
  path: string,
  revalidate = 300
): Promise<string[]> {
  const repo = getDataRepo();
  if (!repo) return [];

  try {
    const res = await fetch(
      `${API}/repos/${repo.owner}/${repo.repo}/contents/${path}`,
      { headers: authHeaders(), next: { revalidate } }
    );
    if (!res.ok) return [];

    const items = (await res.json()) as Array<{ name: string; type: string }>;
    if (!Array.isArray(items)) return [];
    return items
      .filter((i) => i.type === "file" && i.name.endsWith(".json"))
      .map((i) => i.name.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

/** Get the current blob SHA of a file (needed to update it), or null. */
async function getSha(path: string): Promise<string | null> {
  const repo = getDataRepo();
  if (!repo) return null;
  try {
    const res = await fetch(
      `${API}/repos/${repo.owner}/${repo.repo}/contents/${path}`,
      { headers: authHeaders(), cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { sha?: string };
    return json.sha ?? null;
  } catch {
    return null;
  }
}

/** Create or update a JSON file in the data repo. Requires GH_TOKEN. */
export async function writeJson(
  path: string,
  data: unknown,
  message: string
): Promise<void> {
  const repo = getDataRepo();
  if (!repo) throw new Error("GH_DATA_REPO is not configured");
  if (!cleanEnv(process.env.GH_TOKEN)) throw new Error("GH_TOKEN is not configured");

  const sha = await getSha(path);
  const body = {
    message,
    content: encodeBase64(JSON.stringify(data, null, 2) + "\n"),
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(
    `${API}/repos/${repo.owner}/${repo.repo}/contents/${path}`,
    {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write failed (${res.status}): ${text}`);
  }
}
