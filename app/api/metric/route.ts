import { NextResponse } from "next/server";
import { incrMetric, isValidMetricId, type MetricKind } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const KINDS = new Set<MetricKind>(["source", "detail"]);

/**
 * POST { kind: "source" | "detail", id: string } -> { count }
 * Redis INCR metric:{kind}:{id}. No-ops to { count: 0 } without Redis.
 */
export async function POST(req: Request) {
  let body: { kind?: string; id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const kind = typeof body.kind === "string" ? body.kind : "";
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!KINDS.has(kind as MetricKind) || !isValidMetricId(id)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const count = await incrMetric(kind as MetricKind, id);
  return NextResponse.json({ count });
}
