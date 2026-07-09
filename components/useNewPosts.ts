"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "posts:lastSeenAt";

/**
 * Tracks whether the posts feed has content newer than the viewer last saw.
 * Pass `active: true` on the posts page itself — that marks the newest item
 * as seen (clearing the badge everywhere on the next load). On other pages,
 * pass `active: false` to get the badge state.
 */
export function useNewPosts(active: boolean): boolean {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/posts/latest")
      .then((res) => (res.ok ? res.json() : { latest: "" }))
      .then(({ latest }: { latest: string }) => {
        if (cancelled || !latest) return;
        if (active) {
          // Viewing the feed counts as seeing everything currently in it.
          try {
            localStorage.setItem(SEEN_KEY, latest);
          } catch {
            /* private mode / storage disabled — badge simply won't persist */
          }
          setHasNew(false);
          return;
        }
        let seen = "";
        try {
          seen = localStorage.getItem(SEEN_KEY) ?? "";
        } catch {
          /* ignore */
        }
        setHasNew(latest > seen);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active]);

  return hasNew;
}
