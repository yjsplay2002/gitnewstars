# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

주 사용자는 AI 코딩 도구를 쓰는 한국 개발자다. 목적은 "따라잡기": 출퇴근·짬 시간에 모바일로 들어와 이번 주 GitHub에서 뭐가 떴는지, AI 코딩 도구 쪽에 무슨 소식이 있는지를 몇 분 안에 훑고 나간다. 영어 원문 소스를 매일 좇을 시간은 없고, 한국어로 정리된 요약을 원한다.

부차적으로 검색을 통해 개별 도구·토픽 페이지로 들어오는 방문자가 있다(예: 특정 도구 비교, "왜 떴나" 해설 검색). 이들은 한 페이지만 보고 나갈 수 있으므로 각 페이지가 단독으로 성립해야 한다.

## Product Purpose

한 주 동안 GitHub에서 **신규 스타를 가장 많이 받은** 오픈소스 프로젝트와, AI 코딩 도구·모델·스킬·영상 소식을 한국어로 정리해 전달한다. 성공은 방문자가 짧은 세션 안에 "이번 주 뭐가 떴고 왜 떴는지"를 이해하고 나가는 것, 그리고 과거 주차 기록이 시간이 갈수록 참조 가치를 갖는 것이다.

## Positioning

**주간 신규 스타 × 한국어 해설 아카이브.** 세 가지가 겹쳐야 성립한다:

1. **데이터** — "이번 주 신규 스타 증가량"은 GitHub 공식 API에 없다. Trending HTML 파싱으로만 얻는다.
2. **편집** — 자동 번역은 초안일 뿐이고, 관리자가 한국어 설명과 "왜 떴나" 해설을 직접 다듬는다. 사람이 손댄 문장이 자산이다.
3. **시간축** — 매주 스냅샷이 git에 커밋되어 과거 주차 순위와 그 시점의 한국어 설명이 그대로 보존된다.

하루아침에 복제 불가능한 건 3번(누적된 주차 아카이브)이며, 1·2번은 매주 갱신되는 진입 이유다. 순위 나열만 하는 사이트, 번역만 하는 사이트, 도구 목록만 있는 사이트는 이 조합을 대체하지 못한다.

## Operating Context

- **주 사용 상황**: 모바일, 짧은 세션, 하단 탭 내비게이션으로 섹션 이동.
- **콘텐츠 갱신 리듬**: 주간(트렌딩 스냅샷, GitHub Action) + 일간(큐레이션 글, 도구/모델/영상 데이터 갱신 커밋).
- **관리자 워크플로**: Google 로그인 → 인앱에서 한국어 설명/해설 편집 → GitHub Contents API로 `data/overrides.json` 커밋 → 사이트에 반영. 별도 CMS·DB 없음.
- **유입 경로**: 검색(개별 글·도구·토픽 페이지), 직접 방문, RSS/뉴스레터(스캐폴드 단계).

## Capabilities and Constraints

**확정 기능**
- 주간 트렌딩 TOP 20 (신규 스타 내림차순), 주차별 히스토리 아카이브(`data/weeks/<ISO주차>.json`).
- 큐레이션 포스트 피드와 서버 렌더 상세 페이지(`/posts/[id]`), 토픽 랜딩(`/topics/[slug]`).
- AI 도구 디렉터리와 도구 상세(`/tools/[slug]`), 모델 비교, 스킬, 영상 섹션.
- 리뷰·스타·방문 지표(Upstash Redis), RSS 피드, OG 이미지, sitemap/robots/llms.txt.
- 관리자 전용 편집(단일 `ADMIN_EMAIL` Google 계정) 및 뉴스레터 스캐폴드(폼 + API, env 미설정 시 graceful).

**지켜야 할 제약**
- **Vercel 무료 tier + ISR(1시간)** 안에서 동작. 유료 서비스·전용 DB 추가 없이 git 리포지토리와 Redis가 저장소 역할.
- **모바일 우선**. 테마는 **라이트(웜 아이보리, 현재 구현) 기본 + 다크 모드 지원**이 목표 — `prefers-color-scheme` 대응과 수동 토글 둘 다. 현재 `app/globals.css`에 다크 블록이 없으므로 미구현 상태.
- **한/영 토글 유지** — 신규 콘텐츠는 ko/en 필드 쌍을 유지한다.
- **SEO 서버 렌더 필수** — 신규 콘텐츠 페이지는 클라이언트 fetch 렌더 금지, 서버 렌더 + sitemap 등록.
- 환경변수 없이도 읽기 경로는 정상 동작해야 한다(로그인·편집·히스토리만 비활성).
- 트렌딩 데이터는 GitHub Trending HTML 파싱에 의존 — 구조 변경 시 파서 갱신이 필요한 취약점이다.

**기술 스택**: Next.js 15 App Router · React 19 · TypeScript · Auth.js(next-auth v5, Google OAuth) · cheerio · Upstash Redis · GitHub Actions + Contents API.

## Brand Commitments

- 이름: **GitNewStars**.
- 기본 언어는 한국어, 영어는 토글 병기.
- 한국어 설명은 자동 번역 초안 위에 사람이 다듬는 것을 전제로 한다 — 번역투를 그대로 두지 않는다.

## Evidence on Hand

- 실데이터: `data/weeks/`(주차 스냅샷), `data/curated-posts.json`, `data/ai-tools.json`, `data/model-comparison.json`, `data/skills.json`, `data/skillsets.json`, `data/ai-videos.json`, `data/blog.json`, `data/overrides.json`.
- 기획 문서: `docs/plan-phase1-repositioning.md`, `docs/plan-phase2-4.md`.
- **없는 것 — 지어내지 말 것**: 사용자 후기·고객사·트래픽/구독자 수치·수상 이력·가격/라이선스 정책. 뉴스레터는 스캐폴드 상태이며 발송 실적 없음.

## Product Principles

1. **주간 리듬이 제품의 골격이다.** 무엇을 더하든 "이번 주"와 "지난 주차들"이 중심에서 밀려나지 않는다.
2. **사람이 다듬은 한국어가 차별점이다.** 자동 생성물은 초안으로 취급하고, 편집 경로를 항상 열어둔다.
3. **기록은 지운다는 개념이 없다.** 과거 주차는 그 시점 그대로 보존한다.
4. **짧은 모바일 세션 안에 결론이 나야 한다.** 스캔 가능성이 표현보다 우선한다.
5. **무료 tier 안에서 산다.** 인프라를 늘리는 해법보다 정적·ISR·git 저장 방식을 먼저 택한다.

## Accessibility & Inclusion

제품 고유 요구사항으로 확정된 건 없음(미결). 다크 테마 대비, 모바일 터치 타깃, 한/영 언어 표기는 기본 웹 접근성 수준을 지킨다.
