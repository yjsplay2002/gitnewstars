"use client";

import { useState } from "react";

export default function ShareReportClient({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select textarea
      const el = document.getElementById("weekly-report-text") as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <button type="button" className="btn" onClick={copy}>
          {copied ? "복사됨!" : "전체 복사"}
        </button>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          마크다운 초안 · 트렌딩 TOP 10 + 큐레이션 5
        </span>
      </div>
      <textarea
        id="weekly-report-text"
        className="share-textarea"
        readOnly
        value={markdown}
        rows={24}
        style={{
          width: "100%",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 13,
          lineHeight: 1.5,
          padding: 14,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
          resize: "vertical",
        }}
      />
    </div>
  );
}
