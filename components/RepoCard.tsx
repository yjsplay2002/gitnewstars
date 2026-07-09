"use client";

import { useState } from "react";
import type { RepoView } from "@/lib/types";
import type { TopReviewView } from "@/lib/reviews";
import type { Lang, Dict } from "@/lib/i18n";
import ReviewSection from "./ReviewSection";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RepoCard({
  repo,
  lang,
  t,
  isAdmin,
  editable,
  reviewCount,
  topReviews,
}: {
  repo: RepoView;
  lang: Lang;
  t: Dict;
  isAdmin: boolean;
  editable: boolean;
  reviewCount?: number;
  topReviews?: TopReviewView[];
}) {
  const [descKo, setDescKo] = useState(repo.descKo);
  const [whyKo, setWhyKo] = useState(repo.whyKo ?? "");
  const [edited, setEdited] = useState(repo.edited);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(repo.descKo);
  const [whyDraft, setWhyDraft] = useState(repo.whyKo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const description =
    lang === "ko" ? descKo || repo.descEn || t.noDescription : repo.descEn || t.noDescription;

  const isTop3 = repo.rank <= 3;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: repo.fullName,
          descKo: draft.trim(),
          whyKo: whyDraft.trim(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        descKo: string;
        whyKo?: string;
        edited: boolean;
      };
      setDescKo(data.descKo || repo.descEn);
      setWhyKo(data.whyKo ?? "");
      setEdited(data.edited);
      setEditing(false);
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`card${isTop3 ? " card--top" : ""}`}>
      <div className={`rank rank--${repo.rank <= 3 ? repo.rank : "n"}`}>
        <span className="rank__num">{repo.rank}</span>
        {t.rankSuffix && <span className="rank__suffix">{t.rankSuffix}</span>}
      </div>

      <img
        className="avatar"
        src={repo.avatarUrl}
        alt={`${repo.owner} avatar`}
        loading="lazy"
        width={56}
        height={56}
      />

        <a
          className="card__name"
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="card__owner">{repo.owner}/</span>
          {repo.name}
        </a>

        {editing ? (
          <div className="edit">
            <textarea
              className="edit__area"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.editPlaceholder}
              rows={2}
              maxLength={500}
              autoFocus
            />
            <textarea
              className="edit__area edit__area--why"
              value={whyDraft}
              onChange={(e) => setWhyDraft(e.target.value)}
              placeholder={t.whyPlaceholder}
              rows={2}
              maxLength={500}
            />
            <div className="edit__row">
              <button className="btn btn--primary" onClick={save} disabled={saving}>
                {saving ? t.saving : t.save}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setEditing(false);
                  setDraft(descKo);
                  setWhyDraft(whyKo);
                  setError(null);
                }}
                disabled={saving}
              >
                {t.cancel}
              </button>
              {error && <span className="edit__error">{error}</span>}
            </div>
          </div>
        ) : (
          <div className="card__body-text">
            <p className="card__desc">
              {description}
              {lang === "ko" && edited && (
                <span className="edited" title={t.editedBadge}>
                  ·{t.editedBadge}
                </span>
              )}
            </p>
            {whyKo && (
              <div className="card__why">
                <span className="card__why-label">{t.whyLabel} —</span>
                {whyKo}
              </div>
            )}
          </div>
        )}

        <div className="meta">
          {repo.language && (
            <span className="meta__item">
              <span
                className="lang-dot"
                style={{ background: repo.languageColor || "#888" }}
              />
              {repo.language}
            </span>
          )}
          <span className="meta__item">★ {formatNumber(repo.totalStars)}</span>
          <span className="meta__item">{t.forks} {formatNumber(repo.forks)}</span>
          {isAdmin && editable && !editing && (
            <button
              className="meta__edit"
              onClick={() => {
                setDraft(descKo);
                setWhyDraft(whyKo);
                setEditing(true);
              }}
            >
              {t.edit}
            </button>
          )}
        </div>

      <div className="weekly">
        <div className="weekly__num">+{formatNumber(repo.starsThisWeek)}</div>
        <div className="weekly__label">{t.starsThisWeek}</div>
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
        fullName={repo.fullName}
        lang={lang}
        t={t}
        initialCount={reviewCount}
      />
    </div>
  );
}
