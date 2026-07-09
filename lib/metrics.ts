/**
 * Lightweight engagement metrics (Redis INCR).
 * Keys: metric:source:{postId}, metric:detail:{postId}
 * When Redis is unconfigured, all helpers no-op safely.
 */
import { getRedis } from "./redis";

export type MetricKind = "source" | "detail";

/** Safe key segment: post ids are UUIDs or curated-… slugs. */
const ID_RE = /^[\w.-]{1,80}$/;

export function metricKey(kind: MetricKind, id: string): string {
  return `metric:${kind}:${id}`;
}

export function isValidMetricId(id: string): boolean {
  return ID_RE.test(id);
}

/**
 * INCR a metric counter. Returns the new count, or 0 when Redis is missing
 * or the id is invalid. Never throws to the caller.
 */
export async function incrMetric(kind: MetricKind, id: string): Promise<number> {
  if (!isValidMetricId(id)) return 0;
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const n = await redis.incr(metricKey(kind, id));
    return typeof n === "number" ? n : 0;
  } catch {
    return 0;
  }
}
