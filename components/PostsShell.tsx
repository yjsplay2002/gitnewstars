"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { PostView } from "@/lib/posts";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import PostCard from "./PostCard";
import UsageReportForm from "./UsageReportForm";
import SubscribeForm from "./SubscribeForm";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";

export default function PostsShell() {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const signedIn = Boolean(session?.user);
  // Visiting this page marks the feed as seen, clearing the tab badge.
  useNewPosts(true);

  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // ---- infinite scroll: render a growing window over the fetched feed ----
  const PAGE = 8;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const totalRef = useRef(0);
  totalRef.current = posts.length;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => (c < totalRef.current ? Math.min(c + PAGE, totalRef.current) : c));
        }
      },
      { rootMargin: "500px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/posts")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: { posts: PostView[] }) => {
        if (cancelled) return;
        setPosts(data.posts ?? []);
        setLoadError(false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // GitHub-trending style: most weekly stars first, older post wins ties.
  const weeklyTop = useMemo(
    () =>
      posts
        .filter((p) => p.weeklyStarCount > 0)
        .sort(
          (a, b) =>
            b.weeklyStarCount - a.weeklyStarCount || a.createdAt.localeCompare(b.createdAt)
        )
        .slice(0, 10),
    [posts]
  );

  // ---- compose: free-text post OR structured usage report ----
  type ComposeMode = "closed" | "free" | "usage";
  const [composeMode, setComposeMode] = useState<ComposeMode>("closed");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  function openCompose(mode: "free" | "usage") {
    if (!signedIn) {
      signIn("google");
      return;
    }
    setPostError(null);
    setComposeMode(mode);
  }

  function closeCompose() {
    setComposeMode("closed");
    setPostError(null);
  }

  async function submitPost() {
    if (!title.trim() || !body.trim() || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, mediaUrl }),
      });
      if (!res.ok) {
        setPostError(res.status === 429 ? t.tooFast : t.postError);
        return;
      }
      const data = (await res.json()) as { post: PostView };
      setPosts((list) => [data.post, ...list]);
      setTitle("");
      setBody("");
      setMediaUrl("");
      closeCompose();
    } catch {
      setPostError(t.postError);
    } finally {
      setPosting(false);
    }
  }

  async function toggleStar(id: string) {
    if (!signedIn) {
      signIn("google");
      return;
    }
    const res = await fetch("/api/posts/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      starCount: number;
      weeklyStarCount: number;
      starred: boolean;
    };
    setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }

  async function deletePost(id: string) {
    const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return;
    setPosts((list) => list.filter((p) => p.id !== id));
  }

  function scrollToPost(id: string) {
    const el = document.getElementById(`post-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Target is past the current window — reveal everything, then scroll.
    setVisibleCount(posts.length);
    requestAnimationFrame(() =>
      document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  return (
    <div className="layout">
      {/* ---- left "top this week" sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar__head">
          <span className="sidebar__logo">GitNewStars</span>
          <h2 className="sidebar__title">{t.weeklyTopTitle}</h2>
        </div>
        <nav className="sidebar__nav">
          {weeklyTop.length === 0 && <p className="sidebar__empty">{t.weeklyTopEmpty}</p>}
          {weeklyTop.map((p, i) => (
            <button key={p.id} className="week-link post-rank" onClick={() => scrollToPost(p.id)}>
              <span className={`post-rank__num post-rank__num--${i < 3 ? i + 1 : "n"}`}>
                {i + 1}
              </span>
              <span className="post-rank__title">
                {lang === "en" && p.titleEn ? p.titleEn : p.title}
              </span>
              <span className="post-rank__stars">★ {p.weeklyStarCount}</span>
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
            <a className="tab" href="/blog">
              {t.tabBlog}
            </a>
            <a className="tab" href="/models">
              {t.tabModels}
            </a>
            <a className="tab" href="/tools">
              {t.tabAiTools}
            </a>
            <a className="tab tab--active" href="/posts">
              {t.tabPosts}
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
          <span className="hero__badge">{t.postsBadge}</span>
          <h1 className="hero__title">{t.postsTitle}</h1>
          <p className="hero__subtitle">{t.postsSubtitle}</p>
        </header>

        {/* ---- new post / usage report ---- */}
        <section className="post-compose">
          {composeMode === "closed" && (
            <div className="post-compose__actions">
              {!signedIn ? (
                <button className="btn btn--primary" onClick={() => signIn("google")}>
                  {t.signInToPost}
                </button>
              ) : (
                <button className="btn btn--primary" onClick={() => openCompose("free")}>
                  {t.newPost}
                </button>
              )}
              <button className="btn" onClick={() => openCompose("usage")}>
                {t.usageReport}
              </button>
            </div>
          )}

          {composeMode === "free" && (
            <div className="post-form">
              <input
                className="post-form__input"
                value={title}
                maxLength={120}
                placeholder={t.postTitlePlaceholder}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="post-form__area"
                value={body}
                maxLength={3000}
                rows={5}
                placeholder={t.postBodyPlaceholder}
                onChange={(e) => setBody(e.target.value)}
              />
              <input
                className="post-form__input"
                value={mediaUrl}
                maxLength={500}
                placeholder={t.mediaUrlPlaceholder}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
              <p className="post-form__hint">{t.mediaHint}</p>
              {postError && <p className="edit__error">{postError}</p>}
              <div className="edit__row">
                <button
                  className="btn btn--primary"
                  onClick={submitPost}
                  disabled={posting || !title.trim() || !body.trim()}
                >
                  {posting ? t.posting : t.submitPost}
                </button>
                <button className="btn" onClick={closeCompose} disabled={posting}>
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {composeMode === "usage" && (
            <UsageReportForm
              t={t}
              onCancel={closeCompose}
              onCreated={(post) => {
                setPosts((list) => [post, ...list]);
                closeCompose();
              }}
            />
          )}
        </section>

        {/* ---- feed, newest first ---- */}
        <section className="list">
          {loading && <p className="sidebar__empty">{t.loading}</p>}
          {!loading && loadError && <p className="sidebar__empty">{t.loadError}</p>}
          {!loading && !loadError && posts.length === 0 && (
            <p className="sidebar__empty">{t.noPosts}</p>
          )}
          {posts.slice(0, visibleCount).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              lang={lang}
              t={t}
              canDelete={post.mine || isAdmin}
              onToggleStar={toggleStar}
              onDelete={deletePost}
            />
          ))}
          {visibleCount < posts.length && (
            <div ref={sentinelRef} className="feed-sentinel" aria-hidden>
              {t.loading}
            </div>
          )}
        </section>

        <footer className="footer">
          <SubscribeForm t={t} />
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
      </div>

      <BottomNav active="posts" t={t} />
    </div>
  );
}
