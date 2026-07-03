"use client";

import { useState } from "react";
import type { RepoView } from "@/lib/types";
import type { Lang, Dict } from "@/lib/i18n";
import ReviewSection from "./ReviewSection";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function RepoCard({
  repo,
  lang,
  t,
  isAdmin,
  editable,
  reviewCount,
}: {
  repo: RepoView;
  lang: Lang;
  t: Dict;
  isAdmin: boolean;
  editable: boolean;
  reviewCount?: number;
}) {
  const [descKo, setDescKo] = useState(repo.descKo);
  const [edited, setEdited] = useState(repo.edited);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(repo.descKo);
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
        body: JSON.stringify({ fullName: repo.fullName, descKo: draft.trim() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { descKo: string; edited: boolean };
      setDescKo(data.descKo || repo.descEn);
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
            <div className="edit__row">
              <button className="btn btn--primary" onClick={save} disabled={saving}>
                {saving ? t.saving : t.save}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setEditing(false);
                  setDraft(descKo);
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
          <p className="card__desc">
            {description}
            {lang === "ko" && edited && (
              <span className="edited" title={t.editedBadge}>
                ✍️
              </span>
            )}
          </p>
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
          <span className="meta__item">⭐ {formatNumber(repo.totalStars)}</span>
          <span className="meta__item">🍴 {formatNumber(repo.forks)}</span>
          {isAdmin && editable && !editing && (
            <button
              className="meta__edit"
              onClick={() => {
                setDraft(descKo);
                setEditing(true);
              }}
            >
              ✏️ {t.edit}
            </button>
          )}
        </div>

      <div className="weekly">
        <div className="weekly__num">+{formatNumber(repo.starsThisWeek)}</div>
        <div className="weekly__label">{t.starsThisWeek}</div>
      </div>

      <ReviewSection
        fullName={repo.fullName}
        lang={lang}
        t={t}
        initialCount={reviewCount}
      />
    </div>
  );
}
