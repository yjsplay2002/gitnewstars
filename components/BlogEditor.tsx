"use client";

// Markdown editor with live preview. Admin-only; loads an existing post via
// ?slug=... for editing, otherwise starts a new one.
import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BlogPost } from "@/lib/blog";
import { slugify } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { translations } from "@/lib/i18n";

export default function BlogEditor({ posts }: { posts: BlogPost[] }) {
  const { data: session, status } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const router = useRouter();
  const search = useSearchParams();
  const editSlug = search.get("slug") ?? "";
  const t = translations.ko;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const editing = Boolean(editSlug);

  // Prefill when editing an existing post (drafts included via the API-side
  // list passed from the server component).
  useEffect(() => {
    if (!editSlug) return;
    const post = posts.find((p) => p.slug === editSlug);
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setSlugTouched(true);
      setTags(post.tags.join(", "));
      setBody(post.body);
    }
  }, [editSlug, posts]);

  const previewHtml = useMemo(() => renderMarkdown(body), [body]);

  async function save(published: boolean) {
    setState("saving");
    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug || undefined,
        title,
        body,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        published,
      }),
    });
    if (res.ok) {
      const data: { slug: string } = await res.json();
      setState("saved");
      if (published) {
        router.push(`/blog/${data.slug}`);
        router.refresh();
      }
    } else {
      setState("error");
    }
  }

  if (status === "loading") return null;
  if (!isAdmin) {
    return (
      <div className="blog-editor blog-editor--denied">
        <p>{t.blogAdminOnly}</p>
        {!session?.user && (
          <button className="btn" onClick={() => signIn("google")}>
            {t.signIn}
          </button>
        )}
      </div>
    );
  }

  const canSave = title.trim().length > 0 && body.trim().length > 0 && state !== "saving";

  return (
    <div className="blog-editor">
      <h1 className="blog-editor__heading">
        {editing ? t.blogEditorTitleEdit : t.blogEditorTitleNew}
      </h1>

      <label className="blog-editor__label">
        {t.blogFieldTitle}
        <input
          className="blog-editor__input"
          value={title}
          maxLength={150}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slugTouched && !editing) setSlug(slugify(e.target.value));
          }}
        />
      </label>

      <label className="blog-editor__label">
        {t.blogFieldSlug}
        <input
          className="blog-editor__input"
          value={slug}
          disabled={editing}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
      </label>

      <label className="blog-editor__label">
        {t.blogFieldTags}
        <input
          className="blog-editor__input"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="AI, Claude, 자동화"
        />
      </label>

      <div className="blog-editor__body-head">
        <span>{t.blogFieldBody}</span>
        <button
          className="lang-btn"
          type="button"
          onClick={() => setShowPreview((v) => !v)}
        >
          {t.blogPreview} {showPreview ? "▲" : "▼"}
        </button>
      </div>
      <div className={`blog-editor__split${showPreview ? "" : " blog-editor__split--solo"}`}>
        <textarea
          className="blog-editor__textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={24}
          placeholder="# 제목\n\n본문을 마크다운으로 작성하세요…"
        />
        {showPreview && (
          <div
            className="blog-prose blog-editor__preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>
      <p className="blog-editor__hint">{t.blogEditorHint}</p>

      <div className="blog-editor__actions">
        <button className="btn" disabled={!canSave} onClick={() => save(true)}>
          {state === "saving" ? t.blogSaving : t.blogPublish}
        </button>
        <button
          className="btn btn--secondary"
          disabled={!canSave}
          onClick={() => save(false)}
        >
          {t.blogSaveDraft}
        </button>
        {state === "saved" && <span className="blog-editor__status">{t.blogSaved}</span>}
        {state === "error" && (
          <span className="blog-editor__status blog-editor__status--error">
            {t.blogSaveError}
          </span>
        )}
      </div>
    </div>
  );
}
