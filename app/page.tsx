import AppShell from "@/components/AppShell";
import { getCurrentWeek } from "@/lib/data";
import { listArchivedWeeks } from "@/lib/history";

// Re-generate at most once per hour (ISR) — free-tier friendly.
export const revalidate = 3600;

export default async function Home() {
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
      <main className="page page--error">
        <h1>⚠️</h1>
        <p>Failed to load GitHub trending data. / 데이터를 불러오지 못했습니다.</p>
        <p>Please try again in a moment. / 잠시 후 다시 시도해 주세요.</p>
      </main>
    );
  }

  return (
    <AppShell
      repos={repos}
      weekIds={weekIds}
      activeWeekId={null}
      isArchive={false}
    />
  );
}
