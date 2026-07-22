"use client";

/**
 * Operator-only newsletter console: review today's auto-composed digest
 * draft, then explicitly approve ("발송") to mail it to every subscriber
 * via the operator's Gmail. There is no automatic send.
 */
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import TopNav from "@/components/TopNav";

interface Preview {
  subject: string;
  html: string;
  subscribers: string[];
  gmailReady: boolean;
}

export default function NewsletterAdminPage() {
  const { data: session, status } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultError, setResultError] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/newsletter/preview")
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        setPreview((await res.json()) as Preview);
      })
      .catch(() => setLoadError("초안을 불러오지 못했습니다. 새로고침해 주세요."));
  }, [isAdmin]);

  async function send() {
    if (!preview || sending) return;
    const n = preview.subscribers.length;
    if (!window.confirm(`구독자 ${n}명에게 지금 발송할까요?`)) return;

    setSending(true);
    setResult(null);
    setResultError(false);
    try {
      const res = await fetch("/api/newsletter/send", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: number;
        failed?: string[];
        error?: string;
      };
      if (!res.ok || data.error) {
        setResultError(true);
        setResult(data.error ?? "발송에 실패했습니다.");
      } else if (data.failed && data.failed.length > 0) {
        setResultError(true);
        setResult(
          `${data.sent}명 발송, ${data.failed.length}명 실패: ${data.failed.join(", ")}`
        );
      } else {
        setResult(`✅ ${data.sent}명에게 발송 완료`);
      }
    } catch {
      setResultError(true);
      setResult("발송 요청에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="layout">
      <main className="main main--blog">
        <div className="topbar">
          <TopNav active="blog" />
        </div>

        <p className="post-detail__back">
          <Link href="/blog">← 블로그로 돌아가기</Link>
        </p>

        <h1 className="blog-editor__heading">아침 브리핑 발송 콘솔</h1>

        {status === "loading" && <p className="blog-editor__hint">확인 중…</p>}

        {status !== "loading" && !isAdmin && (
          <div className="blog-editor--denied">
            <p>운영자 계정으로 로그인해야 사용할 수 있습니다.</p>
            <button className="btn btn--primary" onClick={() => signIn("google")}>
              Google 로그인
            </button>
          </div>
        )}

        {isAdmin && (
          <>
            {loadError && <p className="blog-editor__status--error">{loadError}</p>}
            {!preview && !loadError && (
              <p className="blog-editor__hint">오늘의 초안을 만드는 중…</p>
            )}

            {preview && (
              <>
                {!preview.gmailReady && (
                  <p className="newsletter-admin__warn">
                    ⚠️ GMAIL_USER / GMAIL_APP_PASSWORD 환경변수가 없어 발송이
                    불가능합니다. Vercel 설정 후 다시 열어주세요.
                  </p>
                )}

                <div className="newsletter-admin__bar">
                  <div>
                    <p className="blog-editor__label" style={{ marginBottom: 4 }}>
                      제목
                    </p>
                    <p className="newsletter-admin__subject">{preview.subject}</p>
                    <button
                      className="newsletter-admin__count"
                      onClick={() => setShowList((v) => !v)}
                    >
                      구독자 {preview.subscribers.length}명{" "}
                      {showList ? "▲" : "▼"}
                    </button>
                    {showList && (
                      <ul className="newsletter-admin__list">
                        {preview.subscribers.length === 0 && <li>아직 없음</li>}
                        {preview.subscribers.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    className="btn btn--primary"
                    disabled={
                      sending ||
                      !preview.gmailReady ||
                      preview.subscribers.length === 0
                    }
                    onClick={send}
                  >
                    {sending ? "발송 중…" : "✉️ 승인하고 발송"}
                  </button>
                </div>

                {result && (
                  <p
                    className={
                      resultError
                        ? "blog-editor__status--error"
                        : "blog-editor__status"
                    }
                  >
                    {result}
                  </p>
                )}

                <p className="blog-editor__hint">
                  아래는 실제 발송될 메일 그대로의 미리보기입니다 (해지 링크만
                  수신자별로 치환됩니다).
                </p>
                <iframe
                  className="newsletter-admin__preview"
                  title="digest preview"
                  sandbox=""
                  srcDoc={preview.html}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
