import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAiTools,
  getToolBySlug,
  listToolSlugs,
  type AiTool,
} from "@/lib/aiTools";
import { topicsMatchingText } from "@/lib/topics";

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = "https://gitnewstars.vercel.app";

export async function generateStaticParams() {
  return listToolSlugs().map((slug) => ({ slug }));
}

function pricingLabel(pricing: AiTool["pricing"]): string {
  if (pricing === "free") return "무료";
  if (pricing === "paid") return "유료";
  return "부분 무료";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getToolBySlug(slug);
  if (!tool) {
    return { title: "도구를 찾을 수 없습니다 — GitNewStars" };
  }
  const title = `${tool.name} — 사용법·리뷰 | GitNewStars`;
  const description = tool.descKo || tool.descEn;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/tools/${slug}`,
    },
  };
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tool, snapshot] = await Promise.all([getToolBySlug(slug), getAiTools()]);
  if (!tool) notFound();

  const category = snapshot.categories.find((c) => c.key === tool.category);
  const relatedTopics = topicsMatchingText(`${tool.name} ${tool.slug}`);

  let logoHost = "";
  try {
    logoHost = new URL(tool.url).hostname;
  } catch {
    logoHost = "";
  }
  const logoUrl = logoHost
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoHost)}&sz=128`
    : "";

  return (
    <div className="layout">
      <main className="main">
        <div className="topbar">
          <nav className="tabs">
            <Link className="tab" href="/">
              GitHub 트렌딩
            </Link>
            <Link className="tab tab--active" href="/tools">
              AI 툴
            </Link>
            <Link className="tab" href="/posts">
              활용 & 팁
            </Link>
            <Link className="tab" href="/topics">
              토픽
            </Link>
          </nav>
        </div>

        <p className="post-detail__back">
          <Link href="/tools">← AI 툴 목록</Link>
        </p>

        <article className="card tool-card tool-card--detail">
          <div className="tool-detail__head">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="avatar tool-card__logo"
                src={logoUrl}
                alt=""
                width={56}
                height={56}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="tool-card__emoji">{tool.name.slice(0, 1)}</span>
            )}
            <div>
              <h1 className="post__title post__title--detail" style={{ marginBottom: 4 }}>
                {tool.name}
              </h1>
              <p className="tool-card__vendor" style={{ margin: 0 }}>
                {tool.vendor}
                {category && (
                  <>
                    {" · "}
                    {category.emoji} {category.ko}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="meta" style={{ marginTop: 14, marginBottom: 16 }}>
            <span className={`tool-badge tool-badge--${tool.pricing}`}>
              {pricingLabel(tool.pricing)}
            </span>
            {tool.openSource && (
              <span className="tool-badge tool-badge--oss">오픈소스</span>
            )}
            {tool.isNew && <span className="tool-badge tool-badge--new">NEW</span>}
            <span className="tool-badge">인기 {tool.score}</span>
          </div>

          <p className="post__body post__body--detail">{tool.descKo || tool.descEn}</p>

          <p style={{ marginTop: 20 }}>
            <a
              className="btn"
              href={tool.url}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              공식 사이트 방문 ↗
            </a>
            {tool.githubRepo && (
              <>
                {" "}
                <a
                  className="btn btn--ghost"
                  href={`https://github.com/${tool.githubRepo}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                >
                  GitHub ↗
                </a>
              </>
            )}
          </p>

          {relatedTopics.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 16, marginBottom: 10 }}>관련 토픽</h2>
              <ul className="topic-inline">
                {relatedTopics.map((t) => (
                  <li key={t.slug}>
                    <Link className="topic-chip topic-chip--sm" href={`/topics/${t.slug}`}>
                      {t.labelKo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <footer className="footer">
          <p className="footer__credit">
            GitHub Trending 데이터를 기반으로 제작 · Vercel에 배포됨
          </p>
        </footer>
      </main>
    </div>
  );
}
