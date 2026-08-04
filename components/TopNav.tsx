"use client";

/**
 * Unified top navigation: hamburger drawer + 홈/블로그 primary tabs.
 * The 8-tab row is retired — 랭킹(모델·툴·스킬) and 콘텐츠(팁·영상·토픽)
 * live in the drawer; the active section shows as a third chip so the
 * reader always knows where they are.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
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
  const burgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  // Escape closes, body scroll locks, and Tab stays inside the drawer — a
  // keyboard reader can never land on the page hidden behind the overlay.
  useEffect(() => {
    if (!open) return;

    const focusables = () =>
      Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
        ) ?? []
      );

    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !drawerRef.current?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      burgerRef.current?.focus();
    };
  }, [open]);

  const showSectionChip = active !== "github" && active !== "blog";

  return (
    <>
      <button
        className="nav-burger"
        ref={burgerRef}
        aria-label={t.navMenu}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav className="tabs" aria-label={t.mainNavLabel}>
        <Link
          className={`tab${active === "github" ? " tab--active" : ""}`}
          href="/"
          aria-current={active === "github" ? "page" : undefined}
        >
          {t.navHome}
        </Link>
        <Link
          className={`tab${active === "blog" ? " tab--active" : ""}`}
          href="/blog"
          aria-current={active === "blog" ? "page" : undefined}
        >
          {t.tabBlog}
        </Link>
        {showSectionChip && (
          <Link className="tab tab--active" href={PAGES[active].href} aria-current="page">
            {PAGES[active].label(t)}
            {active === "posts" && postsHasNew && (
              <span className="nav-dot" aria-label={t.newContent} />
            )}
          </Link>
        )}
      </nav>

      {/* Portal to <body>: the mobile topbar's backdrop-filter makes it the
          containing block for fixed descendants, which would trap the
          fixed-position drawer inside the 54px-tall bar. */}
      {open &&
        createPortal(
        <div className="drawer-root">
          <div className="drawer-overlay" onClick={() => setOpen(false)} />
          <aside className="drawer" ref={drawerRef} aria-label={t.navMenu}>
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
                  <Link
                    key={key}
                    className={`drawer__link${active === key ? " drawer__link--active" : ""}`}
                    href={PAGES[key].href}
                    aria-current={active === key ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {PAGES[key].label(t)}
                    {key === "posts" && postsHasNew && (
                      <span className="nav-dot" aria-label={t.newContent} />
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
