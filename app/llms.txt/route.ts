import { listBlogPosts } from "@/lib/blog";
import { markdownExcerpt } from "@/lib/markdown";

export const revalidate = 3600;

const SITE_URL = "https://gitnewstars.vercel.app";

/**
 * /llms.txt — the emerging convention (llmstxt.org) that gives LLM crawlers
 * a curated, markdown map of the site instead of making them infer it from
 * HTML. Regenerated hourly so new blog posts appear automatically.
 */
export async function GET() {
  let postLines = "";
  try {
    const posts = await listBlogPosts();
    postLines = posts
      .map((p) => {
        const ko = `- [${p.title}](${SITE_URL}/blog/${p.slug}): ${markdownExcerpt(p.body, 110)}`;
        return p.titleEn && p.bodyEn
          ? `${ko}\n- [${p.titleEn}](${SITE_URL}/blog/${p.slug}/en) (English edition): ${markdownExcerpt(p.bodyEn, 110)}`
          : ko;
      })
      .join("\n");
  } catch {
    postLines = `- [블로그](${SITE_URL}/blog)`;
  }

  const body = `# GitNewStars

> 한국어 AI 코딩 브리핑 — 이번 주 뜨는 GitHub 프로젝트, AI 코딩 모델 비교, 에이전트 스킬 랭킹, 실전 유즈케이스를 매일 갱신하는 큐레이션 사이트. 데이터는 git 저장소를 DB로 사용해 매일 자동 수집·아카이브된다.

주간 GitHub 트렌딩 TOP 20(한국어 해설 포함), AI 코딩 모델 비교표, Claude Code/Codex/Gemini CLI 도구 팁, 에이전트 스킬 랭킹을 다룬다. 운영자가 직접 실험한 사용기를 블로그에 기록한다.

## 블로그 (운영자 직접 작성한 실험·사용기)

${postLines}

## 주요 섹션

- [GitHub 주간 트렌딩](${SITE_URL}/): 이번 주 스타 급상승 저장소 TOP 20, 한국어 요약
- [AI 모델 비교](${SITE_URL}/models): 코딩용 LLM 가격·컨텍스트·성능 비교, 매일 갱신
- [AI 툴](${SITE_URL}/tools): AI 코딩 CLI/에이전트 도구 정리
- [에이전트 스킬](${SITE_URL}/skills): Claude Code 등 에이전트 스킬 랭킹
- [활용 & 팁](${SITE_URL}/posts): 매일 큐레이션되는 AI 코딩 뉴스·유즈케이스
- [영상](${SITE_URL}/videos): AI 코딩 유튜브 추천
- [RSS 피드](${SITE_URL}/feed.xml)

## 데이터 특성

- 매일 오전(KST) 자동 크롤 → git commit → 재배포. 모든 페이지는 서버 렌더링된 정적 HTML로 크롤러가 그대로 읽을 수 있다.
- 주간 트렌딩 스냅샷은 ${SITE_URL}/week/2026-W29 형식의 아카이브로 보존된다.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
