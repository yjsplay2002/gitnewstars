# Phase 2–4 기획: SEO 확장 · 배포 · 커뮤니티 루프

> Phase 1(리포지셔닝 + /posts/[id])은 완료·배포됨. 이 문서는 나머지 로드맵.
> 원칙: 외부 계정/유료 서비스 없이 리포 내에서 구현 가능한 것 우선. 뉴스레터 등
> 외부 의존은 스캐폴드(폼+API)만 만들고 env 미설정 시 graceful.

---

## Phase 2 — SEO 확장 + 신디케이션

### 2A. 토픽 랜딩 페이지 `/topics/[slug]`
큐레이션 글에 `tags` 필드가 **없음** → 키워드 매칭으로 토픽 소속 파생(스키마 변경 없이).

- `lib/topics.ts` 신설:
  - 토픽 정의 배열: `{ slug, labelKo, labelEn, keywords: string[] }`.
    초기 토픽: `claude-code`(클로드 코드/Claude Code/claude code), `codex`, `cursor`,
    `mcp`(MCP/모델 컨텍스트), `gemini`(제미나이/Gemini), `vibe-coding`(바이브 코딩/vibe coding).
  - `postsForTopic(slug)`: 큐레이션 글의 `title+body+titleEn+bodyEn`를 소문자화해
    해당 토픽 keywords 중 하나라도 포함하면 매칭. `curatedAt` 내림차순.
  - `listTopics()`, `getTopic(slug)`.
- `app/topics/[slug]/page.tsx`: 서버 렌더. generateMetadata(제목 `<라벨> 관련 AI 코딩 소식 — GitNewStars`,
  description 토픽 설명), generateStaticParams(전체 토픽 slug), `revalidate=3600`.
  본문: 토픽 라벨 h1 + 매칭 글 카드 리스트(각 글은 `/posts/[id]` 링크). 매칭 0건이면
  "아직 글 없음" 안내(404 아님 — 랜딩 유지).
- `app/topics/page.tsx`: 토픽 인덱스(전체 토픽 칩/링크).
- sitemap에 `/topics`, 각 `/topics/[slug]` 추가.

### 2B. 도구 상세 페이지 `/tools/[slug]`
`data/ai-tools.json` tool 스키마: `slug,name,category,url,vendor,descKo,descEn,pricing,openSource,score`.

- `lib/aiTools.ts`에 `getToolBySlug(slug)`, `listToolSlugs()` 추가(없으면).
- `app/tools/[slug]/page.tsx`: 서버 렌더. generateMetadata(제목 `<name> — 사용법·리뷰 | GitNewStars`,
  description descKo). 본문: 도구명 h1, vendor, 카테고리, pricing/오픈소스 배지, descKo,
  공식 링크(rel="nofollow noopener"), 관련 토픽 링크(도구명이 토픽 keywords에 걸리면).
  기존 리뷰/star가 tool에 붙어 있으면(components/ToolCard 참고) 재사용, 아니면 정적.
- `ToolCard`에서 도구명 → `/tools/[slug]` 링크.
- sitemap에 각 `/tools/[slug]` 추가.

### 2C. RSS 피드 + OG 이미지
- `app/feed.xml/route.ts`(또는 `app/rss.xml`): 최신 큐레이션 글 20개 RSS 2.0.
  title/link(`/posts/[id]`)/description(body 발췌)/pubDate(curatedAt). `Content-Type: application/xml`.
- `app/layout.tsx` `<head>`에 `alternates.types['application/rss+xml']` 등록.
- OG 이미지: `app/posts/[id]/opengraph-image.tsx` — `next/og`의 ImageResponse로
  글 제목 + "GitNewStars 한국어 AI 코딩 브리핑" 브랜드 라인 렌더(1200x630, 웜 아이보리 톤).
  폰트는 시스템/기본 사용(외부 폰트 fetch 금지 — 빌드 안정).

### 2D. 주간 공유 리포트
- `lib/weeklyReport.ts`: 이번 주 트렌딩 TOP N + 최근 큐레이션 글 N개를 마크다운/텍스트로
  생성하는 순수 함수(배포 초안용). 관리자만 보는 `/tools/share` 같은 페이지 or 기존 ShareButton 확장.
  — **범위 최소화**: 함수 + 관리자 페이지 1개까지만. 자동 발송 없음.

**Phase 2 완료 기준**: `npm run build` 성공. `/topics/*`, `/tools/[slug]`, `/feed.xml`,
OG 이미지 라우트 생성. 홈/BottomNav 또는 적절한 위치에서 토픽 인덱스 진입 가능.

---

## Phase 3 — 커뮤니티 루프 + 지표

### 3A. 검증된 사용기 제보 폼
자유게시판 금지 — 구조화 입력만. 기존 유저 포스트 인프라(Redis, `lib/posts.ts`,
`/api/posts`) 재사용.

- 제보 폼 컴포넌트: 필드 = 도구(select: ai-tools.json 목록 or 자유입력) / 무슨 문제 /
  효과 / 실패·주의점 / 코드·프롬프트(선택). 이 구조화 값을 조합해 기존 유저 포스트
  `body`로 직렬화(마크다운 섹션) 후 기존 생성 API로 저장. 새 스토리지 도입 금지.
- 로그인(Google) 필요 여부는 기존 유저 포스트 정책 따름.
- 폼 진입점: Posts 탭 상단 "사용기 제보" 버튼.

### 3B. 경량 지표
- 기존 `/api/visit`, `VisitorCounter` 패턴 재사용.
- 원문 클릭(sourceUrl) / 상세 진입 카운트를 Redis INCR로 집계(키: `metric:...`).
  Redis 미설정 시 no-op. 관리자용 간단 집계 노출은 선택(범위 밖이면 생략).

**Phase 3 완료 기준**: 빌드 성공. 제보 폼으로 구조화 사용기 작성→저장→피드 노출.
Redis 미설정 환경에서도 폼 렌더/빌드 정상.

---

## Phase 4 — 뉴스레터 스캐폴드 (외부 서비스 의존)

완전 자동화 불가(Buttondown/Resend 키 필요). **스캐폴드만**:
- 구독 폼 컴포넌트 + `app/api/subscribe/route.ts`: 이메일 검증 후, `NEWSLETTER_*` env
  있으면 해당 서비스로 전달, 없으면 Redis `newsletter:subscribers` set에 저장(폴백) 또는
  501 대신 "준비 중" 응답. **키 없으면 빌드/런타임 깨지지 않게**.
- README/docs에 필요한 env 명시.
- 자동 발송·템플릿은 범위 밖.

**Phase 4 완료 기준**: 빌드 성공. 구독 폼 렌더. env 없이도 안전.

### Phase 4 env (optional)

구독 API (`POST /api/subscribe`) 우선순위:

1. **외부 뉴스레터 서비스** — 둘 다 설정 시 guarded hook으로 전달 (프로바이더 미정, SDK 없음):
   - `NEWSLETTER_API_URL` — 구독 요청을 받을 엔드포인트 URL
   - `NEWSLETTER_API_KEY` — `Authorization: Bearer …` 용 키
2. **Redis 폴백** — Upstash 설정 시 set `newsletter:subscribers`에 이메일 저장:
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (기존 방문자 카운터와 동일)
3. **둘 다 없음** — HTTP 200 + `{ status: "pending", message: "준비 중" }`. 빌드/런타임 안전.

자동 발송·템플릿·프로바이더 SDK는 범위 밖. 실제 서비스 연동 시
`app/api/subscribe/route.ts`의 `TODO(newsletter-provider)` 스텁만 교체.

---

## 위임/구현 순서 (순차 — 병렬 워킹트리 충돌 방지)
1. **Phase 2** (Grok) — SEO/신디케이션. 파일 다수 신규, 기존 최소 수정.
2. **Phase 3** (Grok) — 커뮤니티. Posts/Redis 인프라 확장.
3. **Phase 4** (Grok) — 뉴스레터 스캐폴드.

각 페이즈 Grok 완료 → 다음 페이즈 착수. 3개 전부 끝나면 오케스트레이터(Claude)가
`npm run build` + 라우트/diff 검증 후 커밋·push(yjsplay2002).

## 공통 규칙
- 기존 코드 스타일/i18n(`lib/i18n.ts`)/웜 아이보리 팔레트 준수.
- `data/*.json` 스키마 파괴 금지(추가는 선택 필드로).
- 외부 폰트/CDN fetch 금지(빌드 안정).
- SITE_URL은 기존 `https://gitnewstars.vercel.app` 상수 재사용.
