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
  title: "GitNewStars — 한국어 AI 코딩 브리핑",
  description:
    "이번 주 뜨는 GitHub 프로젝트와 AI 코딩 도구 실전 팁을 한국어로. 왜 떴는지까지 5분 안에.",
  openGraph: {
    title: "GitNewStars — 한국어 AI 코딩 브리핑",
    description:
      "Korean AI-coding briefing — trending GitHub repos & daily agent-tool tips",
    type: "website",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
