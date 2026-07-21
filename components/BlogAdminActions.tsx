"use client";

// Edit/delete controls on a blog article — rendered only for the admin.
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { translations } from "@/lib/i18n";

export default function BlogAdminActions({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const t = translations.ko;

  if (!session?.user?.isAdmin) return null;

  async function remove() {
    if (!window.confirm(t.blogDeleteConfirm)) return;
    setDeleting(true);
    const res = await fetch(`/api/blog?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/blog");
      router.refresh();
    } else {
      setDeleting(false);
      window.alert(t.blogSaveError);
    }
  }

  return (
    <p className="blog-admin-actions">
      <a className="btn" href={`/blog/write?slug=${encodeURIComponent(slug)}`}>
        {t.blogEdit}
      </a>
      <button className="btn btn--danger" onClick={remove} disabled={deleting}>
        {t.blogDelete}
      </button>
    </p>
  );
}
