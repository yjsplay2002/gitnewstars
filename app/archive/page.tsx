import type { Metadata } from "next";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { getArchivedWeek, listArchivedWeeks } from "@/lib/history";
import { translations } from "@/lib/i18n";
import { weekLabel } from "@/lib/week";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "주간 기록 전체 — GitNewStars",
  description:
    "매주 월요일 커밋된 GitHub 주간 신규 스타 스냅샷 아카이브. 지나간 주차는 그때 순위와 한국어 설명 그대로 남습니다.",
  alternates: { canonical: "/archive" },
};

/**
 * Archive index. Each week carries its own recognition cue — the repo that led
 * it and the week's total new stars — so a returning reader can pick a week by
 * what happened in it, not by counting back from today's date.
 */
export default async function ArchivePage() {
  const t = translations.ko;
  const weekIds = await listArchivedWeeks();
  const snapshots = await Promise.all(weekIds.map((id) => getArchivedWeek(id)));

  const weeks = weekIds.map((id, i) => {
    const repos = snapshots[i]?.repos ?? [];
    const totalNew = repos.reduce((sum, r) => sum + (r.starsThisWeek || 0), 0);
    return { id, top: repos[0] ?? null, totalNew, count: repos.length };
  });

  return (
    <div className="layout layout--plain">
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>

      <main className="main" id="main-content">
        <div className="topbar">
          <TopNav active="github" t={t} />
        </div>

        <header className="hero">
          <span className="hero__badge">{t.archiveBadge}</span>
          <h1 className="hero__title">{t.archiveTitle}</h1>
          <p className="hero__subtitle">{t.archiveSubtitleIndex}</p>
        </header>

        {weeks.length === 0 ? (
          <p className="archive__empty">{t.archiveEmpty}</p>
        ) : (
          <ol className="archive">
            {weeks.map((w) => (
              <li key={w.id}>
                <Link className="archive__week" href={`/week/${w.id}`}>
                  <span className="archive__label">{weekLabel(w.id, "ko")}</span>
                  {w.top && (
                    <span className="archive__top">
                      <span className="archive__top-rank">
                        {t.archiveTopLabel}
                      </span>
                      {w.top.fullName}
                    </span>
                  )}
                  <span className="archive__sum">
                    <span className="archive__sum-num">
                      +{w.totalNew.toLocaleString("ko-KR")}
                    </span>
                    <span className="archive__sum-label">
                      {t.archiveSumLabel}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}

        <footer className="footer">
          <p>
            {t.archiveWeekCount} {weeks.length}개 · {t.updatedNote}
          </p>
          <p className="footer__credit">{t.footer}</p>
        </footer>
      </main>

      <BottomNav active="github" t={t} />
    </div>
  );
}
