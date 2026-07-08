"use client";

import { useState } from "react";
import type { RepoView } from "@/lib/types";
import type { Lang, Dict } from "@/lib/i18n";

const SITE_URL = "https://gitnewstars.vercel.app";
const X_LIMIT = 270; // a little under X's 280
const THREADS_LIMIT = 490; // a little under Threads' 500
const CHUNK_LIMIT = 250; // per reply in an admin thread (URLs count as ~23 on X)
const DIVIDER = "\n\n✂━━━━━━━━━━━━ ✂\n\n";

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default function ShareButton({
  repos,
  lang,
  t,
  isAdmin,
  headerLabel,
}: {
  repos: RepoView[];
  lang: Lang;
  t: Dict;
  isAdmin: boolean;
  headerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [shorts, setShorts] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const head = `🌟 ${headerLabel} ${t.shareThisWeek}\n👉 ${SITE_URL}`;
  const tail = lang === "ko" ? "#GitHub #오픈소스" : "#GitHub #OpenSource";

  function desc(r: RepoView, n: number): string {
    return truncate((lang === "ko" ? r.descKo : r.descEn) || r.fullName, n);
  }

  /** Single-post version (general users): top entries that fit + "more" note, no per-line links. */
  function cappedText(budget: number): string {
    const reserve = 28; // room for the "…+N more" line
    let body = "";
    let used = head.length + tail.length + 4 + reserve;
    let shown = 0;
    for (const r of repos) {
      const line = `\n\n${r.rank}. ${desc(r, 42)} ⭐${fmt(r.starsThisWeek)}`;
      if (used + line.length > budget) break;
      body += line;
      used += line.length;
      shown++;
    }
    let more = "";
    if (shown < repos.length) {
      const n = repos.length - shown;
      more =
        lang === "ko"
          ? `\n\n…외 ${n}개 더 → 위 링크`
          : `\n\n…+${n} more → link above`;
    }
    return `${head}${body}${more}\n\n${tail}`;
  }

  /** Full list split into reply-sized chunks (admin): header + all entries with links. */
  function threadText(): string {
    if (!shorts) return "";
    const blocks = repos.map(
      (r, i) =>
        `${r.rank}. ${desc(r, 60)} ⭐${fmt(r.starsThisWeek)}\n${shorts[i]}`
    );

    const chunks: string[] = [];
    let cur = head; // first chunk seeds with the header
    for (const b of blocks) {
      const candidate = cur ? `${cur}\n\n${b}` : b;
      if (candidate.length > CHUNK_LIMIT && cur) {
        chunks.push(cur);
        cur = b;
      } else {
        cur = candidate;
      }
    }
    if (cur) chunks.push(cur);

    const n = chunks.length;
    const numbered = chunks.map((c, i) => `${c}\n(${i + 1}/${n})`);
    numbered[n - 1] += `\n${tail}`;
    return numbered.join(DIVIDER);
  }

  // What the textarea shows and the Copy button copies.
  const displayText = isAdmin ? threadText() : cappedText(X_LIMIT);

  async function loadShorts() {
    setLoading(true);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: repos.map((r) => r.url) }),
      });
      const data = res.ok ? ((await res.json()) as { short?: string[] }) : {};
      setShorts(
        Array.isArray(data.short) && data.short.length === repos.length
          ? data.short
          : repos.map((r) => r.url)
      );
    } catch {
      setShorts(repos.map((r) => r.url));
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    setCopied(false);
    // Only the admin thread needs shortened links; fetch once.
    if (isAdmin && !shorts) void loadShorts();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can select the textarea manually */
    }
  }

  function shareTo(base: string, budget: number) {
    window.open(
      base + encodeURIComponent(cappedText(budget)),
      "_blank",
      "noopener,noreferrer"
    );
  }

  const busy = isAdmin && (loading || !shorts);

  return (
    <>
      <button className="fab" onClick={openModal} aria-label={t.shareAria}>
        ↗
      </button>

      {open && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal__head">
              <span className="modal__title">{t.shareTitle}</span>
              <button
                className="modal__close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {busy ? (
              <p className="modal__loading">{t.shareLoading}</p>
            ) : (
              <>
                <textarea
                  className="modal__text"
                  value={displayText}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="modal__actions">
                  <button className="share-btn share-btn--copy" onClick={copy}>
                    {copied
                      ? `✓ ${t.copied}`
                      : `${isAdmin ? t.copyFull : t.copy}`}
                  </button>
                  <button
                    className="share-btn share-btn--x"
                    onClick={() =>
                      shareTo(
                        "https://twitter.com/intent/tweet?text=",
                        X_LIMIT
                      )
                    }
                  >
                    𝕏 {t.shareX}
                  </button>
                  <button
                    className="share-btn share-btn--threads"
                    onClick={() =>
                      shareTo(
                        "https://www.threads.net/intent/post?text=",
                        THREADS_LIMIT
                      )
                    }
                  >
                    @ {t.shareThreads}
                  </button>
                </div>
                <p className="share-hint">
                  {isAdmin ? t.shareHintAdmin : t.shareHintUser}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
