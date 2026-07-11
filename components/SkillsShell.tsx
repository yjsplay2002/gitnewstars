"use client";

import { useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { SkillsSnapshot } from "@/lib/skills";
import { SKILL_CATEGORIES } from "@/lib/skills";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";

function fmtStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function SkillsShell({ snapshot }: { snapshot: SkillsSnapshot }) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const postsHasNew = useNewPosts(false);

  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Only categories that actually have skills, to avoid empty filters.
  const usedCategories = useMemo(() => {
    const present = new Set(snapshot.skills.map((s) => s.category));
    return SKILL_CATEGORIES.filter((c) => present.has(c.key));
  }, [snapshot.skills]);

  const visible = useMemo(
    () =>
      activeCategory === "all"
        ? snapshot.skills
        : snapshot.skills.filter((s) => s.category === activeCategory),
    [snapshot.skills, activeCategory]
  );

  const catLabel = (key: string) => {
    const c = SKILL_CATEGORIES.find((x) => x.key === key);
    return c ? (lang === "ko" ? c.ko : c.en) : key;
  };

  return (
    <div className="layout">
      {/* ---- left category sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar__head">
          <span className="sidebar__logo">GitNewStars</span>
          <h2 className="sidebar__title">{t.categoriesTitle}</h2>
        </div>
        <nav className="sidebar__nav">
          <button
            className={`week-link${activeCategory === "all" ? " week-link--active" : ""}`}
            onClick={() => setActiveCategory("all")}
          >
            <span className="week-link__dot" />
            {t.allSkills}
          </button>
          {usedCategories.map((c) => (
            <button
              key={c.key}
              className={`week-link${activeCategory === c.key ? " week-link--active" : ""}`}
              onClick={() => setActiveCategory(c.key)}
            >
              {lang === "ko" ? c.ko : c.en}
            </button>
          ))}
        </nav>
      </aside>

      {/* ---- main content ---- */}
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <a className="tab" href="/">
              {t.tabGithub}
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
            <a className="tab tab--active" href="/skills">
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
          <span className="hero__badge">{t.skillsBadge}</span>
          <h1 className="hero__title">{t.skillsTitle}</h1>
          <p className="hero__subtitle">{t.skillsSubtitle}</p>
        </header>

        {visible.length === 0 ? (
          <p className="sidebar__empty">{t.skillsEmpty}</p>
        ) : (
          <section className="skill-grid">
            {visible.map((s, i) => {
              const desc = lang === "en" ? s.descEn : s.descKo;
              return (
                <a
                  key={s.id}
                  className="skill-card"
                  href={`https://github.com/${s.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="skill-card__head">
                    <span className="skill-card__rank">{i + 1}</span>
                    <span className="skill-card__stars">★ {fmtStars(s.stars)}</span>
                  </div>
                  <h3 className="skill-card__name">{s.name}</h3>
                  <p className="skill-card__repo">{s.repo}</p>
                  <p className="skill-card__desc">{desc}</p>
                  <div className="skill-card__meta">
                    <span className="skill-card__cat">{catLabel(s.category)}</span>
                    <span className="skill-badge skill-badge--free">{t.freeBadge}</span>
                    <span className="skill-card__gh">{t.viewOnGithub2} ↗</span>
                  </div>
                </a>
              );
            })}
          </section>
        )}

        <footer className="footer">
          <p>{t.skillsUpdated}</p>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
      </div>

      <BottomNav active="skills" t={t} postsHasNew={postsHasNew} />
    </div>
  );
}
