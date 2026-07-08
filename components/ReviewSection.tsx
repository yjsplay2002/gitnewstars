"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import type { Lang, Dict } from "@/lib/i18n";

interface CommentView {
  id: string;
  authorName: string;
  authorImage: string;
  text: string;
  createdAt: string;
  mine: boolean;
}

interface ReviewView extends CommentView {
  comments: CommentView[];
  starCount: number;
  starred: boolean;
}

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function errorKey(res: Response): Promise<"tooFast" | "postError"> {
  return res.status === 429 ? "tooFast" : "postError";
}

export default function ReviewSection({
  fullName,
  lang,
  t,
  initialCount,
}: {
  fullName: string;
  lang: Lang;
  t: Dict;
  initialCount?: number;
}) {
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const isAdmin = Boolean(session?.user?.isAdmin);

  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<ReviewView[]>([]);
  const [count, setCount] = useState<number | undefined>(initialCount);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const shownCount = loaded ? reviews.length : count;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reviews?repo=${encodeURIComponent(fullName)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { reviews: ReviewView[] };
        setReviews(data.reviews);
        setLoaded(true);
      } catch {
        setError(t.loadError);
      } finally {
        setLoading(false);
      }
    }
  }

  async function postReview() {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: fullName, text }),
      });
      if (!res.ok) throw new Error(await errorKey(res));
      const data = (await res.json()) as { review: ReviewView };
      setReviews((prev) => [data.review, ...prev]);
      setCount((c) => (c ?? 0) + 1);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error && e.message === "tooFast" ? t.tooFast : t.postError);
    } finally {
      setPosting(false);
    }
  }

  async function removeReview(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    const res = await fetch(
      `/api/reviews?repo=${encodeURIComponent(fullName)}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setCount((c) => Math.max(0, (c ?? 1) - 1));
    }
  }

  async function postComment(reviewId: string) {
    const text = (commentDrafts[reviewId] ?? "").trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: fullName, reviewId, text }),
      });
      if (!res.ok) throw new Error(await errorKey(res));
      const data = (await res.json()) as { comment: CommentView };
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, comments: [...r.comments, data.comment] } : r
        )
      );
      setCommentDrafts((d) => ({ ...d, [reviewId]: "" }));
    } catch (e) {
      setError(e instanceof Error && e.message === "tooFast" ? t.tooFast : t.postError);
    } finally {
      setPosting(false);
    }
  }

  async function toggleStar(reviewId: string) {
    if (!signedIn) {
      signIn("google");
      return;
    }
    const res = await fetch("/api/reviews/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: fullName, reviewId }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { starCount: number; starred: boolean };
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId ? { ...r, starCount: data.starCount, starred: data.starred } : r
      )
    );
  }

  async function removeComment(reviewId: string, id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    const res = await fetch(
      `/api/reviews/comments?reviewId=${encodeURIComponent(reviewId)}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId ? { ...r, comments: r.comments.filter((c) => c.id !== id) } : r
        )
      );
    }
  }

  return (
    <div className="reviews">
      <button className="reviews__toggle" onClick={toggle} aria-expanded={open}>
        {t.reviewsToggle}
        <span className="reviews__count">{shownCount ?? 0}</span>
        <span className="reviews__chev">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="reviews__panel">
          {signedIn ? (
            <div className="review-form">
              <textarea
                className="edit__area"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t.writeReviewPlaceholder}
                rows={2}
                maxLength={1000}
              />
              <div className="edit__row">
                <button
                  className="btn btn--primary"
                  onClick={postReview}
                  disabled={posting || !draft.trim()}
                >
                  {posting ? t.posting : t.post}
                </button>
                {error && <span className="edit__error">{error}</span>}
              </div>
            </div>
          ) : (
            <button className="btn reviews__signin" onClick={() => signIn("google")}>
              {t.signInToWrite}
            </button>
          )}

          {loading && <p className="reviews__note">{t.loading}</p>}
          {!loading && loaded && reviews.length === 0 && (
            <p className="reviews__note">{t.noReviews}</p>
          )}
          {!loading && !loaded && error && <p className="reviews__note">{error}</p>}

          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id} className="review">
                <div className="review__head">
                  {r.authorImage ? (
                    <img
                      className="review__avatar"
                      src={r.authorImage}
                      alt=""
                      width={24}
                      height={24}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="review__avatar review__avatar--fallback">
                      {(r.authorName || "·").slice(0, 1)}
                    </span>
                  )}
                  <span className="review__author">{r.authorName}</span>
                  <span className="review__date">{fmtDate(r.createdAt, lang)}</span>
                  <button
                    className={`review__star${r.starred ? " review__star--active" : ""}`}
                    onClick={() => toggleStar(r.id)}
                    aria-pressed={r.starred}
                  >
                    {r.starred ? "★" : "☆"} {r.starCount > 0 && r.starCount}
                  </button>
                  {(r.mine || isAdmin) && (
                    <button className="review__del" onClick={() => removeReview(r.id)}>
                      {t.delete}
                    </button>
                  )}
                </div>
                <p className="review__text">{r.text}</p>

                <div className="review__comments">
                  {r.comments.map((c) => (
                    <div key={c.id} className="comment">
                      <div className="review__head">
                        {c.authorImage ? (
                          <img
                            className="review__avatar review__avatar--sm"
                            src={c.authorImage}
                            alt=""
                            width={18}
                            height={18}
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="review__avatar review__avatar--fallback">
                            {(c.authorName || "·").slice(0, 1)}
                          </span>
                        )}
                        <span className="review__author">{c.authorName}</span>
                        <span className="review__date">{fmtDate(c.createdAt, lang)}</span>
                        {(c.mine || isAdmin) && (
                          <button
                            className="review__del"
                            onClick={() => removeComment(r.id, c.id)}
                          >
                            {t.delete}
                          </button>
                        )}
                      </div>
                      <p className="review__text">{c.text}</p>
                    </div>
                  ))}

                  {signedIn && (
                    <div className="comment-form">
                      <input
                        className="comment-form__input"
                        value={commentDrafts[r.id] ?? ""}
                        onChange={(e) =>
                          setCommentDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            postComment(r.id);
                          }
                        }}
                        placeholder={t.commentPlaceholder}
                        maxLength={500}
                      />
                      <button
                        className="btn"
                        onClick={() => postComment(r.id)}
                        disabled={posting || !(commentDrafts[r.id] ?? "").trim()}
                      >
                        {t.post}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
