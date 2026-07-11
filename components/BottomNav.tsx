// Mobile-only fixed bottom tab bar (hidden on desktop via CSS).
// Client component by inheritance: imported from the "use client" shells.
import type { Dict } from "@/lib/i18n";

export type TabKey = "github" | "tools" | "posts" | "videos" | "skills";

const TABS: { key: TabKey; href: string; label: (t: Dict) => string }[] = [
  { key: "github", href: "/", label: (t) => t.tabGithub },
  { key: "tools", href: "/tools", label: (t) => t.tabAiTools },
  { key: "posts", href: "/posts", label: (t) => t.tabPosts },
  { key: "videos", href: "/videos", label: (t) => t.tabVideos },
  { key: "skills", href: "/skills", label: (t) => t.tabSkills },
];

export default function BottomNav({
  active,
  t,
  postsHasNew = false,
}: {
  active: TabKey;
  t: Dict;
  postsHasNew?: boolean;
}) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map(({ key, href, label }) => (
        <a
          key={key}
          className={`bottom-nav__item${active === key ? " bottom-nav__item--active" : ""}`}
          href={href}
          aria-current={active === key ? "page" : undefined}
        >
          <span className="bottom-nav__label">
            {label(t)}
            {key === "posts" && postsHasNew && (
              <span className="nav-dot" aria-label={t.newContent} />
            )}
          </span>
        </a>
      ))}
    </nav>
  );
}
