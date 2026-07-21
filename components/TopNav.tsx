"use client";

/**
 * Unified top navigation: hamburger drawer + 홈/블로그 primary tabs.
 * The 8-tab row is retired — 랭킹(모델·툴·스킬) and 콘텐츠(팁·영상·토픽)
 * live in the drawer; the active section shows as a third chip so the
 * reader always knows where they are.
 */
import { useEffect, useState } from "react";
import { translations, type Dict } from "@/lib/i18n";

export type NavKey =
  | "github"
  | "blog"
  | "models"
  | "tools"
  | "skills"
  | "posts"
  | "videos"
  | "topics";

const PAGES: Record<NavKey, { href: string; label: (t: Dict) => string }> = {
  github: { href: "/", label: (t) => t.tabGithub },
  blog: { href: "/blog", label: (t) => t.tabBlog },
  models: { href: "/models", label: (t) => t.tabModels },
  tools: { href: "/tools", label: (t) => t.tabAiTools },
  skills: { href: "/skills", label: (t) => t.tabSkills },
  posts: { href: "/posts", label: (t) => t.tabPosts },
  videos: { href: "/videos", label: (t) => t.tabVideos },
  topics: { href: "/topics", label: (t) => t.tabTopics },
};

const GROUPS: { title: (t: Dict) => string; keys: NavKey[] }[] = [
  { title: (t) => t.navMenu, keys: ["github", "blog"] },
  { title: (t) => t.navRankings, keys: ["models", "tools", "skills"] },
  { title: (t) => t.navContent, keys: ["posts", "videos", "topics"] },
];

export default function TopNav({
  active,
  t = translations.ko,
  postsHasNew = false,
}: {
  active: NavKey;
  t?: Dict;
  postsHasNew?: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const showSectionChip = active !== "github" && active !== "blog";

  return (
    <>
      <button
        className="nav-burger"
        aria-label={t.navMenu}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className="tabs">
        <a
          className={`tab${active === "github" ? " tab--active" : ""}`}
          href="/"
        >
          {t.navHome}
        </a>
        <a
          className={`tab${active === "blog" ? " tab--active" : ""}`}
          href="/blog"
        >
          {t.tabBlog}
        </a>
        {showSectionChip && (
          <a className="tab tab--active" href={PAGES[active].href}>
            {PAGES[active].label(t)}
            {active === "posts" && postsHasNew && (
              <span className="nav-dot" aria-label={t.newContent} />
            )}
          </a>
        )}
      </nav>

      {open && (
        <div className="drawer-root">
          <div className="drawer-overlay" onClick={() => setOpen(false)} />
          <aside className="drawer" aria-label={t.navMenu}>
            <div className="drawer__head">
              <span className="sidebar__logo">GitNewStars</span>
              <button
                className="drawer__close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            {GROUPS.map((g) => (
              <div key={g.title(t)} className="drawer__group">
                <p className="drawer__group-title">{g.title(t)}</p>
                {g.keys.map((key) => (
                  <a
                    key={key}
                    className={`drawer__link${active === key ? " drawer__link--active" : ""}`}
                    href={PAGES[key].href}
                  >
                    {PAGES[key].label(t)}
                    {key === "posts" && postsHasNew && (
                      <span className="nav-dot" aria-label={t.newContent} />
                    )}
                  </a>
                ))}
              </div>
            ))}
          </aside>
        </div>
      )}
    </>
  );
}
