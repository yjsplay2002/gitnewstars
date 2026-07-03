/**
 * Thin wrapper over Upstash Redis (REST-based, works on Vercel serverless).
 * Backs the visitor counter (online / today / total). If the env vars are
 * not configured, getRedis() returns null and the counter API degrades to
 * always reporting zero, so the rest of the app keeps working.
 */
import { Redis } from "@upstash/redis";

// Windows shells can prepend a UTF-8 BOM when a secret is piped into
// another process; strip anything outside printable ASCII to guard against it.
function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
