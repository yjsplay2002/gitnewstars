"use client";

import { useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { AiVideosSnapshot, VideoCategory } from "@/lib/videos";
import { VIDEO_CATEGORIES } from "@/lib/videos";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";

export default function VideosShell({ snapshot }: { snapshot: AiVideosSnapshot }) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const postsHasNew = useNewPosts(false);

  const [activeCategory, setActiveCategory] = useState<VideoCategory | "all">("all");

  const visible = useMemo(
    () =>
      activeCategory === "all"
        ? snapshot.videos
        : snapshot.videos.filter((v) => v.category === activeCategory),
    [snapshot.videos, activeCategory]
  );

  const categoryLabel = (key: VideoCategory) => {
    const c = VIDEO_CATEGORIES.find((x) => x.key === key);
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
            {t.allVideos}
          </button>
          {VIDEO_CATEGORIES.map((c) => (
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
            <a className="tab tab--active" href="/videos">
              {t.tabVideos}
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
          <span className="hero__badge">{t.videosBadge}</span>
          <h1 className="hero__title">{t.videosTitle}</h1>
          <p className="hero__subtitle">{t.videosSubtitle}</p>
        </header>

        {visible.length === 0 ? (
          <p className="sidebar__empty">{t.videosEmpty}</p>
        ) : (
          <section className="video-grid">
            {visible.map((v) => {
              const title = lang === "en" && v.titleEn ? v.titleEn : v.title;
              const desc = lang === "en" ? v.descEn || v.descKo : v.descKo || v.descEn;
              return (
                <article key={v.id} className="video-card">
                  <div className="video-card__frame">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}`}
                      title={title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="video-card__body">
                    <span className="video-card__cat">{categoryLabel(v.category)}</span>
                    <h3 className="video-card__title">{title}</h3>
                    {desc && <p className="video-card__desc">{desc}</p>}
                    <a
                      className="video-card__link"
                      href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.watchOnYoutube} ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="footer">
          <p>{t.videosUpdated}</p>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
      </div>

      <BottomNav active="videos" t={t} postsHasNew={postsHasNew} />
    </div>
  );
}
