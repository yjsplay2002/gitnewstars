// Mobile-only fixed bottom tab bar (hidden on desktop via CSS).
// Client component by inheritance: imported from the "use client" shells.
import type { Dict } from "@/lib/i18n";

export type TabKey = "github" | "tools" | "posts";

const TABS: { key: TabKey; href: string; emoji: string; label: (t: Dict) => string }[] = [
  { key: "github", href: "/", emoji: "⭐", label: (t) => t.tabGithub },
  { key: "tools", href: "/tools", emoji: "🤖", label: (t) => t.tabAiTools },
  { key: "posts", href: "/posts", emoji: "💡", label: (t) => t.tabPosts },
];

export default function BottomNav({ active, t }: { active: TabKey; t: Dict }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map(({ key, href, emoji, label }) => (
        <a
          key={key}
          className={`bottom-nav__item${active === key ? " bottom-nav__item--active" : ""}`}
          href={href}
          aria-current={active === key ? "page" : undefined}
        >
          <span className="bottom-nav__icon">{emoji}</span>
          <span className="bottom-nav__label">{label(t)}</span>
        </a>
      ))}
    </nav>
  );
}
