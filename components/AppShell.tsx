"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { RepoView } from "@/lib/types";
import { translations, type Lang } from "@/lib/i18n";
import { weekLabel } from "@/lib/week";
import RepoCard from "./RepoCard";
import ShareButton from "./ShareButton";

export default function AppShell({
  repos,
  weekIds,
  activeWeekId,
  isArchive,
}: {
  repos: RepoView[];
  weekIds: string[];
  activeWeekId: string | null; // null = current week
  isArchive: boolean;
}) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);

  return (
    <div className="layout">
      {/* ---- left history sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar__head">
          <span className="sidebar__logo">⭐ GitNewStars</span>
          <h2 className="sidebar__title">{t.historyTitle}</h2>
        </div>
        <nav className="sidebar__nav">
          <a
            className={`week-link${!isArchive ? " week-link--active" : ""}`}
            href="/"
          >
            <span className="week-link__dot" />
            {t.currentWeek}
          </a>
          {weekIds.map((id) => (
            <a
              key={id}
              className={`week-link${
                activeWeekId === id ? " week-link--active" : ""
              }`}
              href={`/week/${id}`}
            >
              {weekLabel(id, lang)}
            </a>
          ))}
          {weekIds.length === 0 && (
            <p className="sidebar__empty">{t.noHistory}</p>
          )}
        </nav>
      </aside>

      {/* ---- main content ---- */}
      <main className="main">
        <div className="topbar">
          {session?.user ? (
            <span className="user">
              <span className="user__badge">{t.adminBadge}</span>
              <button className="lang-btn" onClick={() => signOut()}>
                {t.signOut}
              </button>
            </span>
          ) : (
            <button className="lang-btn" onClick={() => signIn("google")}>
              🔑 {t.signIn}
            </button>
          )}
          <button
            className="lang-btn"
            onClick={() => setLang((l) => (l === "ko" ? "en" : "ko"))}
            aria-label="Toggle language"
          >
            🌐 {t.langToggle}
          </button>
        </div>

        <header className="hero">
          <span className="hero__badge">
            {isArchive && activeWeekId
              ? weekLabel(activeWeekId, lang)
              : t.badge}
          </span>
          <h1 className="hero__title">
            {isArchive && activeWeekId
              ? weekLabel(activeWeekId, lang)
              : t.title}
          </h1>
          <p className="hero__subtitle">
            {isArchive ? t.archiveSubtitle : t.subtitle}
          </p>
          {isAdmin && !isArchive && (
            <p className="hero__hint">💡 {t.editHint}</p>
          )}
        </header>

        <section className="list">
          {repos.map((repo) => (
            <RepoCard
              key={repo.fullName}
              repo={repo}
              lang={lang}
              t={t}
              isAdmin={isAdmin}
              editable={!isArchive}
            />
          ))}
        </section>

        <footer className="footer">
          <p>{isArchive ? t.archivedNote : t.updatedNote}</p>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <ShareButton
        repos={repos}
        lang={lang}
        t={t}
        isAdmin={isAdmin}
        headerLabel={
          isArchive && activeWeekId
            ? weekLabel(activeWeekId, lang)
            : t.currentWeek
        }
      />
    </div>
  );
}
