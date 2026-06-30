import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getArchivedWeek, listArchivedWeeks } from "@/lib/history";

export const revalidate = 3600;

export default async function WeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;

  const [snapshot, weekIds] = await Promise.all([
    getArchivedWeek(week),
    listArchivedWeeks(),
  ]);

  if (!snapshot) notFound();

  return (
    <AppShell
      repos={snapshot.repos}
      weekIds={weekIds}
      activeWeekId={week}
      isArchive={true}
    />
  );
}
