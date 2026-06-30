import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "GitNewStars — 이번 주 뜨는 GitHub 프로젝트 TOP 20",
  description:
    "지난 7일간 가장 많은 별을 새로 받은 GitHub 오픈소스 프로젝트 TOP 20. The top 20 GitHub projects that gained the most new stars this week.",
  openGraph: {
    title: "GitNewStars — Top 20 Trending GitHub Projects This Week",
    description:
      "The open-source projects that gained the most new stars over the past 7 days.",
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
