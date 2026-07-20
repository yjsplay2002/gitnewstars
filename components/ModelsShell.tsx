"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import comparison from "@/data/model-comparison.json";
import { translations, type Lang } from "@/lib/i18n";
import BottomNav from "./BottomNav";
import ModelScatter, { type EffortInfo } from "./ModelScatter";
import VisitorCounter from "./VisitorCounter";
import { useNewPosts } from "./useNewPosts";

type ModelRow = {
  id: string;
  vendor: string;
  name: string;
  priceIn: number;
  priceOut: number;
  context: string;
  swe: number | null;
  sweApprox: boolean;
  openWeight: boolean;
  noteKo: string;
  noteEn: string;
  effort?: EffortInfo;
};

type Source = {
  name: string;
  url: string;
  descKo: string;
  descEn: string;
};

const MODELS = comparison.models as ModelRow[];
const SOURCES = comparison.sources as Source[];

function fmtPrice(n: number): string {
  return n < 1 ? `$${n}` : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export default function ModelsShell() {
  const [lang, setLang] = useState<Lang>("ko");
  const t = translations[lang];
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);
  const postsHasNew = useNewPosts(false);

  // Scored models first (desc); score-pending models at the bottom.
  const rows = [...MODELS].sort(
    (a, b) => (b.swe ?? -1) - (a.swe ?? -1)
  );
  const scored = rows.filter(
    (m): m is ModelRow & { swe: number } => m.swe != null
  );
  const maxSwe = Math.max(...scored.map((m) => m.swe));

  return (
    <div className="layout">
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <a className="tab" href="/">
              {t.tabGithub}
            </a>
            <a className="tab tab--active" href="/models">
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

        <header className="hero">
          <span className="hero__badge">{t.modelsBadge}</span>
          <h1 className="hero__title">{t.modelsTitle}</h1>
          <p className="hero__subtitle">{t.modelsSubtitle}</p>
        </header>

        <ModelScatter models={scored} t={t} lang={lang} />

        <div className="model-table-wrap">
          <table className="model-table">
            <thead>
              <tr>
                <th>{t.thModel}</th>
                <th>{t.thVendor}</th>
                <th>{t.thSwe}</th>
                <th className="num">{t.thPriceIn}</th>
                <th className="num">{t.thPriceOut}</th>
                <th>{t.thContext}</th>
                <th>{t.thNote}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="model-table__model">
                    {m.name}
                    {m.openWeight && (
                      <span className="model-badge">{t.openWeightBadge}</span>
                    )}
                  </td>
                  <td className="model-table__vendor">{m.vendor}</td>
                  <td className="num">
                    {m.swe == null ? (
                      "—"
                    ) : (
                      <>
                        <span
                          className="model-swe-bar"
                          style={{ width: `${(m.swe / maxSwe) * 60}px` }}
                          aria-hidden
                        />
                        {m.sweApprox ? "~" : ""}
                        {m.swe}%
                      </>
                    )}
                  </td>
                  <td className="num">{fmtPrice(m.priceIn)}</td>
                  <td className="num">{fmtPrice(m.priceOut)}</td>
                  <td>{m.context}</td>
                  <td className="model-table__note">
                    {lang === "ko" ? m.noteKo : m.noteEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="model-sources">
          <h2 className="model-sources__title">{t.modelSourcesTitle}</h2>
          <ul>
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name} ↗
                </a>{" "}
                — {lang === "ko" ? s.descKo : s.descEn}
              </li>
            ))}
          </ul>
        </section>

        <p className="model-disclaimer">
          {t.modelsUpdatedPrefix}: {comparison.lastUpdated}. {t.modelsDisclaimer}
        </p>

        <footer className="footer">
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <div className="fab-bar">
        <VisitorCounter t={t} />
      </div>

      <BottomNav active="models" t={t} postsHasNew={postsHasNew} />
    </div>
  );
}
