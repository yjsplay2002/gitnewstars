"use client";

import { useState } from "react";
import type { RepoView } from "@/lib/types";
import type { Lang, Dict } from "@/lib/i18n";

const SITE_URL = "https://gitnewstars.vercel.app";

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
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function buildText() {
    setLoading(true);

    // Shorten the GitHub URLs server-side (falls back to full URLs on failure).
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

    // Lead with the site URL up top to drive clicks.
    const header = `🌟 ${headerLabel} ${t.shareThisWeek}\n👉 ${SITE_URL}`;
    const lines = repos.map((r, i) => {
      const desc = truncate(
        (lang === "ko" ? r.descKo : r.descEn) || r.fullName,
        60
      );
      return `${r.rank}. ${desc} ⭐${fmt(r.starsThisWeek)}\n${shorts[i]}`;
    });
    const footer =
      lang === "ko" ? "\n#GitHub #오픈소스" : "\n#GitHub #OpenSource";

    setText([header, "", ...lines, footer].join("\n"));
    setLoading(false);
  }

  function openModal() {
    setOpen(true);
    setCopied(false);
    if (!text) void buildText();
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

  function shareTo(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
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
                        "https://twitter.com/intent/tweet?text=" +
                          encodeURIComponent(text)
                      )
                    }
                  >
                    𝕏 {t.shareX}
                  </button>
                  <button
                    className="share-btn share-btn--threads"
                    onClick={() =>
                      shareTo(
                        "https://www.threads.net/intent/post?text=" +
                          encodeURIComponent(text)
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
