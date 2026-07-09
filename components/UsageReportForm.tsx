"use client";

import { useMemo, useState } from "react";
import bundled from "@/data/ai-tools.json";
import type { Dict } from "@/lib/i18n";
import type { PostView } from "@/lib/posts";
import {
  isUsageReportValid,
  serializeUsageReport,
  usageReportTitle,
} from "@/lib/usageReport";

const OTHER = "__other__";

export default function UsageReportForm({
  t,
  onCancel,
  onCreated,
}: {
  t: Dict;
  onCancel: () => void;
  onCreated: (post: PostView) => void;
}) {
  const tools = useMemo(
    () =>
      [...bundled.tools]
        .map((x) => x.name)
        .sort((a, b) => a.localeCompare(b, "en")),
    []
  );

  const [toolSelect, setToolSelect] = useState(tools[0] ?? OTHER);
  const [toolOther, setToolOther] = useState("");
  const [problem, setProblem] = useState("");
  const [effect, setEffect] = useState("");
  const [failure, setFailure] = useState("");
  const [codePrompt, setCodePrompt] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tool =
    toolSelect === OTHER ? toolOther.trim() : toolSelect.trim();

  const fields = { tool, problem, effect, failure, codePrompt };
  const canSubmit = isUsageReportValid(fields) && !posting;

  async function submit() {
    if (!canSubmit) return;
    setPosting(true);
    setError(null);
    const title = usageReportTitle(fields);
    const body = serializeUsageReport(fields);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t.tooFast : t.postError);
        return;
      }
      const data = (await res.json()) as { post: PostView };
      onCreated(data.post);
    } catch {
      setError(t.postError);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="post-form usage-form">
      <h3 className="usage-form__title">{t.usageReportTitle}</h3>
      <p className="post-form__hint">{t.usageReportHint}</p>

      <label className="usage-form__label">
        {t.usageTool}
        <select
          className="post-form__input"
          value={toolSelect}
          onChange={(e) => setToolSelect(e.target.value)}
        >
          {tools.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={OTHER}>{t.usageToolOther}</option>
        </select>
      </label>

      {toolSelect === OTHER && (
        <input
          className="post-form__input"
          value={toolOther}
          maxLength={80}
          placeholder={t.usageToolOtherPlaceholder}
          onChange={(e) => setToolOther(e.target.value)}
        />
      )}

      <label className="usage-form__label">
        {t.usageProblem}
        <textarea
          className="post-form__area"
          value={problem}
          maxLength={800}
          rows={3}
          placeholder={t.usageProblemPlaceholder}
          onChange={(e) => setProblem(e.target.value)}
        />
      </label>

      <label className="usage-form__label">
        {t.usageEffect}
        <textarea
          className="post-form__area"
          value={effect}
          maxLength={800}
          rows={3}
          placeholder={t.usageEffectPlaceholder}
          onChange={(e) => setEffect(e.target.value)}
        />
      </label>

      <label className="usage-form__label">
        {t.usageFailure}
        <textarea
          className="post-form__area"
          value={failure}
          maxLength={600}
          rows={2}
          placeholder={t.usageFailurePlaceholder}
          onChange={(e) => setFailure(e.target.value)}
        />
      </label>

      <label className="usage-form__label">
        {t.usageCodePrompt}
        <textarea
          className="post-form__area"
          value={codePrompt}
          maxLength={1000}
          rows={4}
          placeholder={t.usageCodePromptPlaceholder}
          onChange={(e) => setCodePrompt(e.target.value)}
        />
      </label>

      {error && <p className="edit__error">{error}</p>}

      <div className="edit__row">
        <button className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
          {posting ? t.posting : t.submitUsageReport}
        </button>
        <button className="btn" onClick={onCancel} disabled={posting}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
