// Client component by inheritance: only imported from ToolsShell ("use client").
// No "use client" directive here so the star-toggle callback prop is allowed.
import { useState } from "react";
import type { AiTool } from "@/lib/aiTools";
import type { TopReviewView } from "@/lib/reviews";
import type { Lang, Dict } from "@/lib/i18n";
import ReviewSection from "./ReviewSection";

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ToolCard({
  tool,
  rank,
  lang,
  t,
  starCount,
  starred,
  onToggleStar,
  reviewCount,
  topReviews,
}: {
  tool: AiTool;
  rank: number;
  lang: Lang;
  t: Dict;
  starCount: number;
  starred: boolean;
  onToggleStar: (slug: string) => void;
  reviewCount?: number;
  topReviews?: TopReviewView[];
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    new URL(tool.url).hostname
  )}&sz=128`;

  const description = lang === "ko" ? tool.descKo || tool.descEn : tool.descEn;
  const pricingLabel =
    tool.pricing === "free"
      ? t.pricingFree
      : tool.pricing === "paid"
        ? t.pricingPaid
        : t.pricingFreemium;
  const isTop3 = rank <= 3;

  return (
    <div className={`card tool-card${isTop3 ? " card--top" : ""}`}>
      <div className={`rank rank--${rank <= 3 ? rank : "n"}`}>
        <span className="rank__num">{rank}</span>
        {t.rankSuffix && <span className="rank__suffix">{t.rankSuffix}</span>}
      </div>

      {logoFailed ? (
        <span className="tool-card__emoji">{tool.name.slice(0, 1)}</span>
      ) : (
        <img
          className="avatar tool-card__logo"
          src={logoUrl}
          alt={`${tool.name} logo`}
          loading="lazy"
          width={56}
          height={56}
          referrerPolicy="no-referrer"
          onError={() => setLogoFailed(true)}
        />
      )}

      <a className="card__name" href={tool.url} target="_blank" rel="noopener noreferrer">
        {tool.name}
        <span className="tool-card__vendor">{tool.vendor}</span>
      </a>

      <p className="card__desc">{description}</p>

      <div className="meta">
        <span className={`tool-badge tool-badge--${tool.pricing}`}>{pricingLabel}</span>
        {tool.openSource && (
          <a
            className="tool-badge tool-badge--oss"
            href={tool.githubRepo ? `https://github.com/${tool.githubRepo}` : tool.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.openSourceBadge}
          </a>
        )}
        {tool.isNew && <span className="tool-badge tool-badge--new">{t.newBadge}</span>}
        <button
          className={`tool-star${starred ? " tool-star--active" : ""}`}
          onClick={() => onToggleStar(tool.slug)}
          aria-pressed={starred}
        >
          {starred ? "★" : "☆"} {starCount > 0 ? starCount : ""}
        </button>
      </div>

      <div className="weekly">
        <div className="weekly__num">{tool.score}</div>
        <div className="weekly__label">{t.scoreLabel}</div>
      </div>

      {topReviews && topReviews.length > 0 && (
        <div className="top-reviews">
          <div className="top-reviews__title">{t.topReviewsTitle}</div>
          <ul className="top-reviews__list">
            {topReviews.map((r) => (
              <li key={r.id} className="top-review">
                {r.authorImage ? (
                  <img
                    className="review__avatar review__avatar--sm"
                    src={r.authorImage}
                    alt=""
                    width={18}
                    height={18}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="review__avatar review__avatar--fallback">{(r.authorName || "·").slice(0, 1)}</span>
                )}
                <div className="top-review__body">
                  <div className="top-review__head">
                    <span className="review__author">{r.authorName}</span>
                    <span className="top-review__stars">★ {r.starCount}</span>
                    <span className="review__date">{fmtDate(r.createdAt, lang)}</span>
                  </div>
                  <p className="top-review__text">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReviewSection
        fullName={`ai-tools/${tool.slug}`}
        lang={lang}
        t={t}
        initialCount={reviewCount}
      />
    </div>
  );
}
