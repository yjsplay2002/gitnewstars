"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import type { RepoView } from "@/lib/types";
import type { TopReviewView } from "@/lib/reviews";
import { translations, type Lang } from "@/lib/i18n";
import { weekLabel } from "@/lib/week";
import BottomNav from "./BottomNav";
import RepoCard from "./RepoCard";
import ShareButton from "./ShareButton";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";
import TopNav from "./TopNav";
import SubscribeForm from "./SubscribeForm";

/** Weeks shown inline; the rest live on /archive so the rail stays scannable. */
const INLINE_WEEKS = 8;

export default function AppShell({
  repos,
  weekIds,
  activeWeekId,
  currentWeekId,
  isArchive,
  initialLang = "ko",
  langHref,
  reviewCounts = {},
  topReviews = {},
}: {
  repos: RepoView[];
  weekIds: string[];
  activeWeekId: string | null; // null = current week
  currentWeekId?: string;
  isArchive: boolean;
  initialLang?: Lang;
  /** When set, the language control is a real route swap (server-rendered, indexable). */
  langHref?: string;
  reviewCounts?: Record<string, number>;
  topReviews?: Record<string, TopReviewView[]>;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const postsHasNew = useNewPosts(false);

  // Routes that carry their own language (/, /en) win; elsewhere the reader's
  // last choice is restored so the toggle survives navigation.
  useEffect(() => {
    if (langHref) return;
    try {
      const saved = window.localStorage.getItem("gns-lang");
      if (saved === "ko" || saved === "en") setLang(saved);
    } catch {
      /* storage blocked — keep the server default */
    }
  }, [langHref]);

  // Keep assistive tech in sync with what is actually on screen.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function toggleLang() {
    setLang((l) => {
      const next: Lang = l === "ko" ? "en" : "ko";
      try {
        window.localStorage.setItem("gns-lang", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const inlineWeeks = weekIds.slice(0, INLINE_WEEKS);
  const hasMoreWeeks = weekIds.length > INLINE_WEEKS;

  return (
    <div className="layout">
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>

      {/* ---- left history sidebar ---- */}
      <aside className="sidebar" aria-label={t.historyTitle}>
        <div className="sidebar__head">
          <span className="sidebar__logo">GitNewStars</span>
          <p className="sidebar__title">{t.historyTitle}</p>
        </div>
        <nav className="sidebar__nav" aria-label={t.sidebarNavLabel}>
          <Link
            className={`week-link${!isArchive ? " week-link--active" : ""}`}
            href="/"
            aria-current={!isArchive ? "page" : undefined}
          >
            <span className="week-link__dot" />
            {t.currentWeek}
          </Link>
          {inlineWeeks.map((id) => (
            <Link
              key={id}
              className={`week-link${
                activeWeekId === id ? " week-link--active" : ""
              }`}
              href={`/week/${id}`}
              aria-current={activeWeekId === id ? "page" : undefined}
            >
              {weekLabel(id, lang)}
            </Link>
          ))}
          {hasMoreWeeks && (
            <Link className="week-link week-link--all" href="/archive">
              {t.seeAllWeeks} →
            </Link>
          )}
          {weekIds.length === 0 && (
            <p className="sidebar__empty">{t.noHistory}</p>
          )}
        </nav>
      </aside>

      {/* ---- main content ---- */}
      <main className="main" id="main-content">
        <div className="topbar">
          <TopNav active="github" t={t} postsHasNew={postsHasNew} />
          {session?.user ? (
            <span className="user">
              {session.user.image && (
                <img
                  className="user__avatar"
                  src={session.user.image}
                  alt=""
                  width={26}
                  height={26}
                  referrerPolicy="no-referrer"
                />
              )}
              {isAdmin ? (
                <span className="user__badge">{t.adminBadge}</span>
              ) : (
                <span className="user__name">{session.user.name}</span>
              )}
              <button className="lang-btn" onClick={() => signOut()}>
                {t.signOut}
              </button>
            </span>
          ) : (
            <button className="lang-btn" onClick={() => signIn("google")}>
              {t.signIn}
            </button>
          )}
          {langHref ? (
            <a className="lang-btn" href={langHref} hrefLang={lang === "ko" ? "en" : "ko"}>
              {t.langToggle}
            </a>
          ) : (
            <button
              className="lang-btn"
              onClick={toggleLang}
              aria-label="Toggle language"
            >
              {t.langToggle}
            </button>
          )}
        </div>

        <header className="hero">
          <span className="hero__badge">
            {isArchive
              ? t.archivedNote
              : currentWeekId
                ? weekLabel(currentWeekId, lang)
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
          {!isArchive && (
            <Link className="hero__method" href="/methodology">
              {t.methodology} →
            </Link>
          )}
          {isAdmin && !isArchive && (
            <p className="hero__hint">{t.editHint}</p>
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
              reviewCount={reviewCounts[repo.fullName]}
              topReviews={topReviews[repo.fullName]}
            />
          ))}
        </section>

        <footer className="footer">
          <SubscribeForm t={t} />
          <p>{isArchive ? t.archivedNote : t.updatedNote}</p>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
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

      <BottomNav active="github" t={t} postsHasNew={postsHasNew} />
    </div>
  );
}
