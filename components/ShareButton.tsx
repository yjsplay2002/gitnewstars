"use client";

import { useState } from "react";
import type { RepoView } from "@/lib/types";
import type { Lang, Dict } from "@/lib/i18n";

const SITE_URL = "https://gitnewstars.vercel.app";
const X_LIMIT = 270; // a little under X's 280
const THREADS_LIMIT = 490; // a little under Threads' 500

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
  headerLabel,
}: {
  repos: RepoView[];
  lang: Lang;
  t: Dict;
  headerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(""); // full text (copy / textarea)
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const head = `🌟 ${headerLabel} ${t.shareThisWeek}\n👉 ${SITE_URL}`;
  const tail = lang === "ko" ? "#GitHub #오픈소스" : "#GitHub #OpenSource";

  function desc(r: RepoView, n: number): string {
    return truncate((lang === "ko" ? r.descKo : r.descEn) || r.fullName, n);
  }

  /** Full list: rank + description + stars + shortened link, blank line between. */
  async function buildFull() {
    setLoading(true);

    let shorts = repos.map((r) => r.url);
    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: repos.map((r) => r.url) }),
      });
      if (res.ok) {
        const data = (await res.json()) as { short?: string[] };
        if (Array.isArray(data.short) && data.short.length === repos.length) {
          shorts = data.short;
        }
      }
    } catch {
      /* keep full URLs */
    }

    const blocks = repos.map(
      (r, i) => `${r.rank}. ${desc(r, 60)} ⭐${fmt(r.starsThisWeek)}\n${shorts[i]}`
    );
    setText(`${head}\n\n${blocks.join("\n\n")}\n\n${tail}`);
    setLoading(false);
  }

  /** Length-capped version for X / Threads: top entries that fit + "more" note. */
  function buildCapped(budget: number): string {
    const moreReserve = 28; // room for the "…+N more" line
    let body = "";
    let used = head.length + tail.length + 4 + moreReserve;
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

  function openModal() {
    setOpen(true);
    setCopied(false);
    if (!text) void buildFull();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can select the textarea manually */
    }
  }

  function shareTo(base: string, budget: number) {
    window.open(
      base + encodeURIComponent(buildCapped(budget)),
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <>
      <button className="fab" onClick={openModal} aria-label={t.shareAria}>
        📤
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
              <span className="modal__title">📤 {t.shareTitle}</span>
              <button
                className="modal__close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {loading ? (
              <p className="modal__loading">{t.shareLoading}</p>
            ) : (
              <>
                <textarea
                  className="modal__text"
                  value={text}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="modal__actions">
                  <button className="share-btn share-btn--copy" onClick={copy}>
                    {copied ? `✓ ${t.copied}` : `📋 ${t.copy}`}
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
                <p className="share-hint">{t.shareHint}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
