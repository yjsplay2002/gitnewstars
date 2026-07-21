"use client";

import { useEffect, useState } from "react";
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
  const postsHasNew = useNewPosts(false);

  // One batched fetch for the "💬 review count" badges on all cards.
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const names = repos.map((r) => r.fullName).join(",");
    if (!names) return;
    let cancelled = false;
    fetch(`/api/reviews?counts=${encodeURIComponent(names)}`)
      .then((res) => (res.ok ? res.json() : { counts: {} }))
      .then((data: { counts: Record<string, number> }) => {
        if (!cancelled) setReviewCounts(data.counts ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repos]);

  // One batched fetch for each card's top-3 starred reviews (shown even collapsed).
  const [topReviews, setTopReviews] = useState<Record<string, TopReviewView[]>>({});
  useEffect(() => {
    const names = repos.map((r) => r.fullName).join(",");
    if (!names) return;
    let cancelled = false;
    fetch(`/api/reviews?topFor=${encodeURIComponent(names)}`)
      .then((res) => (res.ok ? res.json() : { top: {} }))
      .then((data: { top: Record<string, TopReviewView[]> }) => {
        if (!cancelled) setTopReviews(data.top ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [repos]);

  return (
    <div className="layout">
      {/* ---- left history sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar__head">
          <span className="sidebar__logo">GitNewStars</span>
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
          <nav className="tabs">
            <a className="tab tab--active" href="/">
              {t.tabGithub}
            </a>
            <a className="tab" href="/blog">
              {t.tabBlog}
            </a>
            <a className="tab" href="/models">
              {t.tabModels}
            </a>
            <a className="tab" href="/tools">
              {t.tabAiTools}
            </a>
            <a className="tab" href="/posts">
              {t.tabPosts}
              {postsHasNew && <span className="nav-dot" aria-label={t.newContent} />}
            </a>
            <a className="tab" href="/videos">
              {t.tabVideos}
            </a>
            <a className="tab" href="/skills">
              {t.tabSkills}
            </a>
            <a className="tab" href="/topics">
              {t.tabTopics}
            </a>
          </nav>
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
          <button
            className="lang-btn"
            onClick={() => setLang((l) => (l === "ko" ? "en" : "ko"))}
            aria-label="Toggle language"
          >
            {t.langToggle}
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
