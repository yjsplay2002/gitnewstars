"use client";

import { useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { SkillsSnapshot, ProSkillset } from "@/lib/skills";
import { SKILL_CATEGORIES } from "@/lib/skills";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";
import TopNav from "./TopNav";

function fmtStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function SkillsShell({
  snapshot,
  skillsets = [],
}: {
  snapshot: SkillsSnapshot;
  skillsets?: ProSkillset[];
}) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const postsHasNew = useNewPosts(false);

  const [activeCategory, setActiveCategory] = useState<string>("all");

  // ---- copy the CLI install prompt for a skill ----
  const [copiedId, setCopiedId] = useState<string | null>(null);
  async function copyInstall(repo: string, id: string) {
    const name = repo.split("/")[1] || repo;
    const prompt =
      lang === "ko"
        ? `다음 Claude Code 스킬을 설치해줘: https://github.com/${repo} 를 ~/.claude/skills/${name} 에 git clone 하고, SKILL.md를 읽어 사용 가능한지 확인해줘.`
        : `Install this Claude Code skill: git clone https://github.com/${repo} into ~/.claude/skills/${name}, then read its SKILL.md and confirm it's available.`;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

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
          <TopNav active="skills" t={t} postsHasNew={postsHasNew} />
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

        {/* ---- pro skillsets: how notable devs set up by role ---- */}
        {skillsets.length > 0 && (
          <section className="skillsets">
            <div className="skillsets__head">
              <h2 className="skillsets__title">🎯 {t.proSkillsetsTitle}</h2>
              <p className="skillsets__hint">{t.proSkillsetsHint}</p>
            </div>
            <div className="skillsets__row">
              {skillsets.map((ss) => (
                <article key={ss.id} className="skillset-card">
                  <span className="skillset-card__role">
                    {lang === "ko" ? ss.roleKo : ss.roleEn}
                  </span>
                  <h3 className="skillset-card__persona">
                    {lang === "ko" ? ss.personaKo : ss.personaEn}
                  </h3>
                  <p className="skillset-card__summary">
                    {lang === "ko" ? ss.summaryKo : ss.summaryEn}
                  </p>
                  <div className="skillset-card__stack">
                    <span className="skillset-card__stack-label">{t.proStackLabel}</span>
                    <ul>
                      {(lang === "ko" ? ss.stackKo : ss.stackEn).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <a
                    className="skillset-card__source"
                    href={ss.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ss.sourceName} ↗
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}

        {visible.length === 0 ? (
          <p className="sidebar__empty">{t.skillsEmpty}</p>
        ) : (
          <section className="skill-grid">
            {visible.map((s, i) => {
              const desc = lang === "en" ? s.descEn : s.descKo;
              return (
                <article key={s.id} className="skill-card">
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
                  </div>
                  <div className="skill-card__actions">
                    <button
                      className={`btn skill-card__copy${copiedId === s.id ? " skill-card__copy--done" : ""}`}
                      onClick={() => copyInstall(s.repo, s.id)}
                    >
                      {copiedId === s.id ? t.copiedInstall : t.copyInstall}
                    </button>
                    <a
                      className="skill-card__gh"
                      href={`https://github.com/${s.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.viewOnGithub2} ↗
                    </a>
                  </div>
                </article>
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
