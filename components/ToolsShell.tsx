"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { AiToolsSnapshot } from "@/lib/aiTools";
import type { TopReviewView } from "@/lib/reviews";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import ToolCard from "./ToolCard";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";

/** Coding vertical first; everything else demoted under "기타 도구". */
const PRIMARY_CATEGORY_KEYS = ["coding", "agents"] as const;

export default function ToolsShell({ snapshot }: { snapshot: AiToolsSnapshot }) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const signedIn = Boolean(session?.user);
  const postsHasNew = useNewPosts(false);

  const [activeCategory, setActiveCategory] = useState<string>("coding");
  const [otherOpen, setOtherOpen] = useState(false);

  const { primaryCategories, otherCategories } = useMemo(() => {
    const primarySet = new Set<string>(PRIMARY_CATEGORY_KEYS);
    const byKey = new Map(snapshot.categories.map((c) => [c.key, c]));
    const primary = PRIMARY_CATEGORY_KEYS.map((k) => byKey.get(k)).filter(
      (c): c is NonNullable<typeof c> => Boolean(c)
    );
    const other = snapshot.categories.filter((c) => !primarySet.has(c.key));
    return { primaryCategories: primary, otherCategories: other };
  }, [snapshot.categories]);

  const otherActive = otherCategories.some((c) => c.key === activeCategory);

  const visibleTools = useMemo(() => {
    const tools =
      activeCategory === "all"
        ? [...snapshot.tools]
        : snapshot.tools.filter((tool) => tool.category === activeCategory);
    return tools.sort((a, b) => b.score - a.score);
  }, [snapshot.tools, activeCategory]);



  // ---- tool stars (batched counts + own state, toggle) ----
  const [starCounts, setStarCounts] = useState<Record<string, number>>({});
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const slugs = snapshot.tools.map((tool) => tool.slug).join(",");
    if (!slugs) return;
    let cancelled = false;
    fetch(`/api/tools/star?counts=${encodeURIComponent(slugs)}`)
      .then((res) => (res.ok ? res.json() : { counts: {}, starred: {} }))
      .then((data: { counts: Record<string, number>; starred: Record<string, boolean> }) => {
        if (cancelled) return;
        setStarCounts(data.counts ?? {});
        setStarredMap(data.starred ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [snapshot.tools, signedIn]);

  async function toggleStar(slug: string) {
    if (!signedIn) {
      signIn("google");
      return;
    }
    const res = await fetch("/api/tools/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { starCount: number; starred: boolean };
    setStarCounts((m) => ({ ...m, [slug]: data.starCount }));
    setStarredMap((m) => ({ ...m, [slug]: data.starred }));
  }

  // ---- review counts + top-3 reviews (same endpoints as the repo cards) ----
  const reviewNames = useMemo(
    () => snapshot.tools.map((tool) => `ai-tools/${tool.slug}`),
    [snapshot.tools]
  );
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  const [topReviews, setTopReviews] = useState<Record<string, TopReviewView[]>>({});
  useEffect(() => {
    const names = reviewNames.join(",");
    if (!names) return;
    let cancelled = false;
    fetch(`/api/reviews?counts=${encodeURIComponent(names)}`)
      .then((res) => (res.ok ? res.json() : { counts: {} }))
      .then((data: { counts: Record<string, number> }) => {
        if (!cancelled) setReviewCounts(data.counts ?? {});
      })
      .catch(() => {});
    fetch(`/api/reviews?topFor=${encodeURIComponent(names)}`)
      .then((res) => (res.ok ? res.json() : { top: {} }))
      .then((data: { top: Record<string, TopReviewView[]> }) => {
        if (!cancelled) setTopReviews(data.top ?? {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reviewNames]);

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
            {t.allCategories}
          </button>
          {primaryCategories.map((c) => (
            <button
              key={c.key}
              className={`week-link${activeCategory === c.key ? " week-link--active" : ""}`}
              onClick={() => setActiveCategory(c.key)}
            >
              {lang === "ko" ? c.ko : c.en}
            </button>
          ))}
          {otherCategories.length > 0 && (
            <>
              <button
                className={`week-link week-link--toggle${otherActive || otherOpen ? " week-link--open" : ""}`}
                onClick={() => setOtherOpen((o) => !o)}
                aria-expanded={otherOpen || otherActive}
              >
                {t.otherTools}
                <span className="week-link__chev" aria-hidden>
                  {otherOpen || otherActive ? "▾" : "▸"}
                </span>
              </button>
              {(otherOpen || otherActive) &&
                otherCategories.map((c) => (
                  <button
                    key={c.key}
                    className={`week-link week-link--nested${activeCategory === c.key ? " week-link--active" : ""}`}
                    onClick={() => setActiveCategory(c.key)}
                  >
                    {lang === "ko" ? c.ko : c.en}
                  </button>
                ))}
            </>
          )}
        </nav>
      </aside>

      {/* ---- main content ---- */}
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <a className="tab" href="/">
              {t.tabGithub}
            </a>
            <a className="tab" href="/blog">
              {t.tabBlog}
            </a>
            <a className="tab" href="/models">
              {t.tabModels}
            </a>
            <a className="tab tab--active" href="/tools">
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
          <span className="hero__badge">{t.aiToolsBadge}</span>
          <h1 className="hero__title">{t.aiToolsTitle}</h1>
          <p className="hero__subtitle">{t.aiToolsSubtitle}</p>
        </header>

        <section className="list">
          {visibleTools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              rank={i + 1}
              lang={lang}
              t={t}
              starCount={starCounts[tool.slug] ?? 0}
              starred={Boolean(starredMap[tool.slug])}
              onToggleStar={toggleStar}
              reviewCount={reviewCounts[`ai-tools/${tool.slug}`]}
              topReviews={topReviews[`ai-tools/${tool.slug}`]}
            />
          ))}
        </section>

        <footer className="footer">
          <p>{t.aiToolsUpdated}</p>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
      </div>

      <BottomNav active="tools" t={t} postsHasNew={postsHasNew} />
    </div>
  );
}
