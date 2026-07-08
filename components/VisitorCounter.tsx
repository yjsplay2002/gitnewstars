"use client";

import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";

const HEARTBEAT_MS = 25_000;
const VISITOR_ID_KEY = "gns_vid";

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default function VisitorCounter({ t }: { t: Dict }) {
  const [counts, setCounts] = useState<{
    online: number;
    today: number;
    total: number;
  } | null>(null);
  const visitorId = useRef<string | null>(null);

  useEffect(() => {
    visitorId.current = getVisitorId();
    let cancelled = false;

    async function ping() {
      try {
        const res = await fetch("/api/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId: visitorId.current }),
        });
        if (!res.ok || cancelled) return;
        setCounts(await res.json());
      } catch {
        /* offline — keep showing the last known counts */
      }
    }

    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!counts) return null;

  return (
    <div className="visitor-info" aria-live="polite">
      <span className="visitor-info__item">
        {t.visitorsOnline} {fmt(counts.online)}
      </span>
      <span className="visitor-info__item">
        {t.visitorsToday} {fmt(counts.today)}
      </span>
      <span className="visitor-info__item">
        {t.visitorsTotal} {fmt(counts.total)}
      </span>
    </div>
  );
}
