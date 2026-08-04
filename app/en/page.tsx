import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { getCurrentWeek } from "@/lib/data";
import { listArchivedWeeks } from "@/lib/history";
import { getServerReviewData } from "@/lib/reviewsServer";
import { isoWeekId } from "@/lib/week";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "GitNewStars — weekly new-star ranking, explained in Korean",
  description:
    "Weekly new-star gains GitHub's API doesn't expose, why each repo rose, and a permanent weekly archive.",
  alternates: {
    canonical: "/en",
    languages: { ko: "/", en: "/en" },
  },
};

/**
 * English twin of the homepage. It exists as a real route so the English copy
 * is server-rendered and indexable — a client-only toggle never reaches search.
 */
export default async function HomeEn() {
  let repos: Awaited<ReturnType<typeof getCurrentWeek>> = [];
  let weekIds: string[] = [];

  try {
    [repos, weekIds] = await Promise.all([
      getCurrentWeek(),
      listArchivedWeeks(),
    ]);
  } catch {
    // fall through to the error view below
  }

  if (repos.length === 0) {
    return (
      <main className="page page--error" lang="en">
        <h1>Could not load trending data</h1>
        <p>GitHub trending did not respond. Please try again in a moment.</p>
        <div className="page__actions">
          <a className="btn btn--primary" href="/en">
            Try again
          </a>
          <a className="btn" href="/archive">
            Browse past weeks
          </a>
        </div>
      </main>
    );
  }

  const { counts, top } = await getServerReviewData(repos.map((r) => r.fullName));

  return (
    <AppShell
      repos={repos}
      weekIds={weekIds}
      activeWeekId={null}
      currentWeekId={isoWeekId()}
      isArchive={false}
      initialLang="en"
      langHref="/"
      reviewCounts={counts}
      topReviews={top}
    />
  );
}
