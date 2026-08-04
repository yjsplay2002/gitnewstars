import type { Metadata } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { translations } from "@/lib/i18n";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "집계 방법 — GitNewStars",
  description:
    "주간 신규 스타를 어디서 어떻게 가져오는지, 한국어 설명은 누가 쓰는지, 아카이브는 어떻게 보존되는지.",
  alternates: { canonical: "/methodology" },
};

/**
 * The one claim that separates this from GitHub Trending is a measurement
 * claim, so it gets a page that states the method and its limits plainly.
 */
export default function MethodologyPage() {
  const t = translations.ko;
  const sections = [
    { title: t.methodSourceTitle, body: t.methodSourceBody },
    { title: t.methodRankTitle, body: t.methodRankBody },
    { title: t.methodKoTitle, body: t.methodKoBody },
    { title: t.methodArchiveTitle, body: t.methodArchiveBody },
  ];

  return (
    <div className="layout layout--plain">
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>

      <main className="main" id="main-content">
        <div className="topbar">
          <TopNav active="github" t={t} />
        </div>

        <header className="hero hero--doc">
          <span className="hero__badge">{t.methodologyBadge}</span>
          <h1 className="hero__title">{t.methodologyTitle}</h1>
          <p className="hero__subtitle">{t.methodologySubtitle}</p>
        </header>

        <article className="doc">
          {sections.map((s) => (
            <section key={s.title} className="doc__section">
              <h2 className="doc__title">{s.title}</h2>
              <p className="doc__body">{s.body}</p>
            </section>
          ))}
        </article>

        <footer className="footer">
          <Link className="doc__back" href="/">
            {t.methodBack}
          </Link>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <BottomNav active="github" t={t} />
    </div>
  );
}
