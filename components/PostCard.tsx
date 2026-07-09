// Client component by inheritance: only imported from PostsShell ("use client").
import { useState } from "react";
import Link from "next/link";
import type { PostView } from "@/lib/posts";
import type { Lang, Dict } from "@/lib/i18n";
import ReviewSection from "./ReviewSection";
import { trackMetric } from "./TrackMetric";

function fmtDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,20})/;

function PostMedia({ post }: { post: PostView }) {
  const [failed, setFailed] = useState(false);
  if (post.mediaType === "none" || !post.mediaUrl) return null;

  if (post.mediaType === "video") {
    const yt = post.mediaUrl.match(YOUTUBE_RE)?.[1];
    if (yt) {
      return (
        <div className="post__media post__media--video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}`}
            title={post.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="post__media">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video className="post__video" src={post.mediaUrl} controls preload="metadata" />
      </div>
    );
  }

  if (failed) {
    return (
      <a className="post__media-link" href={post.mediaUrl} target="_blank" rel="noopener noreferrer">
        {post.mediaUrl}
      </a>
    );
  }
  return (
    <a className="post__media" href={post.mediaUrl} target="_blank" rel="noopener noreferrer">
      <img
        className="post__image"
        src={post.mediaUrl}
        alt={post.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export default function PostCard({
  post,
  lang,
  t,
  canDelete,
  onToggleStar,
  onDelete,
}: {
  post: PostView;
  lang: Lang;
  t: Dict;
  canDelete: boolean;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const title = lang === "en" && post.titleEn ? post.titleEn : post.title;
  const body = lang === "en" && post.bodyEn ? post.bodyEn : post.body;

  return (
    <article className="card post" id={`post-${post.id}`}>
      <div className="post__head">
        {post.authorImage ? (
          <img
            className="review__avatar"
            src={post.authorImage}
            alt=""
            width={26}
            height={26}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="review__avatar review__avatar--fallback">
            {(post.authorName || "·").slice(0, 1)}
          </span>
        )}
        <span className="review__author">{post.authorName}</span>
        {post.curated && (
          <span className="tool-badge tool-badge--oss">{t.curatedBadge}</span>
        )}
        <span className="review__date">{fmtDate(post.createdAt, lang)}</span>
        {post.mediaType === "video" && (
          <span className="tool-badge tool-badge--new">{t.videoBadge}</span>
        )}
        {post.mediaType === "image" && (
          <span className="tool-badge tool-badge--freemium">{t.imageBadge}</span>
        )}
        {canDelete && !post.curated && (
          <button
            className="review__del"
            onClick={() => {
              if (confirm(t.deleteConfirm)) onDelete(post.id);
            }}
          >
            {t.delete}
          </button>
        )}
      </div>

      <h3 className="post__title">
        <Link href={`/posts/${post.id}`} className="post__title-link">
          {title}
        </Link>
      </h3>
      <p className="post__body">{body}</p>

      <PostMedia post={post} />

      <div className="meta post__meta">
        {post.sourceUrl && (
          <a
            className="post__source"
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackMetric("source", post.id)}
          >
            {t.viewSource} ↗
          </a>
        )}
        <button
          className={`tool-star${post.starred ? " tool-star--active" : ""}`}
          onClick={() => onToggleStar(post.id)}
          aria-pressed={post.starred}
        >
          {post.starred ? "★" : "☆"} {post.starCount > 0 ? post.starCount : ""}
        </button>
        {post.weeklyStarCount > 0 && (
          <span className="post__weekly">
            {t.weeklyStarsLabel} {post.weeklyStarCount}
          </span>
        )}
      </div>

      <ReviewSection fullName={`posts/${post.id}`} lang={lang} t={t} />
    </article>
  );
}
