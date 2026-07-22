import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover so the bottom nav can extend into the home-indicator area.
  viewportFit: "cover",
  themeColor: "#faf9f5",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://gitnewstars.vercel.app"),
  title: "GitNewStars — 한국어 AI 코딩 브리핑",
  description:
    "이번 주 뜨는 GitHub 프로젝트와 AI 코딩 도구 실전 팁을 한국어로. 왜 떴는지까지 5분 안에.",
  alternates: {
    types: {
      "application/rss+xml": "https://gitnewstars.vercel.app/feed.xml",
    },
  },
  openGraph: {
    title: "GitNewStars — 한국어 AI 코딩 브리핑",
    description:
      "Korean AI-coding briefing — trending GitHub repos & daily agent-tool tips",
    type: "website",
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://gitnewstars.vercel.app",
  url: "https://gitnewstars.vercel.app",
  name: "GitNewStars",
  alternateName: "깃뉴스타즈",
  description:
    "한국어 AI 코딩 브리핑 — GitHub 주간 트렌딩, AI 모델 비교, 에이전트 스킬, 실전 유즈케이스를 매일 갱신.",
  inLanguage: "ko",
  publisher: {
    "@type": "Organization",
    name: "GitNewStars",
    url: "https://gitnewstars.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
