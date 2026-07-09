import { ImageResponse } from "next/og";
import { getPostById } from "@/lib/posts";

// Node runtime (default): avoid edge + Redis/github helper import issues.
// No external font fetch — system/default only for build stability.
export const alt = "GitNewStars 한국어 AI 코딩 브리핑";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(id);
  const title = post ? truncate(post.title, 90) : "GitNewStars";
  const source = post?.sourceName || post?.authorName || "";

  // System/default font only — no external font fetch (build stability).
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf9f5",
          padding: "56px 64px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#8b7355",
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#c4a574",
              }}
            />
            GitNewStars
          </div>
          <div
            style={{
              fontSize: title.length > 50 ? 48 : 56,
              fontWeight: 700,
              color: "#2c2416",
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          {source ? (
            <div style={{ fontSize: 26, color: "#6b5d4d" }}>{source}</div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid #e8e0d4",
            paddingTop: 28,
            color: "#8b7355",
            fontSize: 24,
          }}
        >
          <span>한국어 AI 코딩 브리핑</span>
          <span>gitnewstars.vercel.app</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
