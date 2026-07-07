import ToolsShell from "@/components/ToolsShell";
import { getAiTools } from "@/lib/aiTools";

// Re-generate at most once per hour (ISR) — matches the main page.
export const revalidate = 3600;

export default async function ToolsPage() {
  const snapshot = await getAiTools();

  if (snapshot.tools.length === 0) {
    return (
      <main className="page page--error">
        <h1>🤖</h1>
        <p>AI tools data is not available yet. / AI 툴 데이터가 아직 없습니다.</p>
        <p>Please try again in a moment. / 잠시 후 다시 시도해 주세요.</p>
      </main>
    );
  }

  return <ToolsShell snapshot={snapshot} />;
}
