"use client";

import { useEffect, useRef } from "react";
import type { MetricKind } from "@/lib/metrics";

/**
 * Fire-and-forget metric ping on mount (detail views) or on demand.
 * Failures are swallowed so UI never breaks when Redis is off.
 */
export function trackMetric(kind: MetricKind, id: string): void {
  if (!id) return;
  try {
    void fetch("/api/metric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
      keepalive: true,
    }).catch(() => {
      /* offline / Redis missing — ignore */
    });
  } catch {
    /* ignore */
  }
}

/** Mount once per post detail page to count detail views. */
export default function TrackMetric({
  kind,
  id,
}: {
  kind: MetricKind;
  id: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !id) return;
    sent.current = true;
    trackMetric(kind, id);
  }, [kind, id]);
  return null;
}
