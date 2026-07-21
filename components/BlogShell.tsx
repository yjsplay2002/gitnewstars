"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { BlogPost } from "@/lib/blog";
import { CHANNEL_URL, type ChannelVideo } from "@/lib/youtube";
import { markdownExcerpt } from "@/lib/markdown";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";

function fmtDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogShell({
  posts,
  videos = [],
}: {
  posts: BlogPost[];
  videos?: ChannelVideo[];
}) {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const postsHasNew = useNewPosts(false);

  return (
    <div className="layout">
      <main className="main main--blog">
        <div className="topbar">
          <nav className="tabs">
            <a className="tab" href="/">
              {t.tabGithub}
            </a>
            <a className="tab tab--active" href="/blog">
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

        <header className="hero hero--blog">
          <span className="hero__badge">{t.blogBadge}</span>
          <h1 className="hero__title">{t.blogTitle}</h1>
          <p className="hero__subtitle">{t.blogSubtitle}</p>
          {isAdmin && (
            <p className="blog-write-cta">
              <a className="btn" href="/blog/write">
                ✍️ {t.blogWrite}
              </a>
            </p>
          )}
        </header>

        {videos.length > 0 && (
          <section className="blog-videos">
            <div className="blog-videos__head">
              <h2 className="blog-videos__title">{t.blogVideosTitle}</h2>
              <a
                className="blog-videos__channel"
                href={CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                AI Native — {t.blogVideosChannel} ↗
              </a>
            </div>
            <div className="blog-videos__row">
              {videos.map((v) => (
                <a
                  key={v.id}
                  className="blog-video-card"
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="blog-video-card__thumb"
                    src={v.thumbnail}
                    alt=""
                    loading="lazy"
                  />
                  <p className="blog-video-card__title">{v.title}</p>
                  <p className="blog-video-card__date">{fmtDate(v.publishedAt, lang)}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {posts.length === 0 ? (
          <p className="sidebar__empty">{t.blogEmpty}</p>
        ) : (
          <section className="blog-list">
            {posts.map((p) => (
              <article key={p.slug} className="blog-card">
                <a className="blog-card__link" href={`/blog/${p.slug}`}>
                  <p className="blog-card__date">{fmtDate(p.createdAt, lang)}</p>
                  <h2 className="blog-card__title">{p.title}</h2>
                  <p className="blog-card__excerpt">{markdownExcerpt(p.body, 220)}</p>
                  {p.tags.length > 0 && (
                    <p className="blog-card__tags">
                      {p.tags.map((tag) => (
                        <span key={tag} className="blog-tag">
                          {tag}
                        </span>
                      ))}
                    </p>
                  )}
                </a>
              </article>
            ))}
          </section>
        )}

        <footer className="footer">
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
      </div>

      <BottomNav active="blog" t={t} postsHasNew={postsHasNew} />
    </div>
  );
}
