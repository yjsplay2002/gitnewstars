# Phase 1 기획: 한국어 AI 코딩 브리핑 리포지셔닝 + SEO 기반

> 3-모델 전략 자문(Claude/Grok/Codex) 만장일치 항목의 실행 계획.
> 목표: (A) 검색 유입 기반 확보, (B) 포지션을 "한국어 AI 코딩 브리핑"으로 전환.

## 배경 진단

- Posts 피드가 `/api/posts` 클라이언트 fetch 렌더 → 검색엔진에 콘텐츠 안 보임. 큐레이션 자산(매일 갱신되는 `data/curated-posts.json`)이 SEO에 0% 기여 중.
- AI 툴 탭이 9개 카테고리 62개 툴로 비대 — 타깃(AI 코딩 도구 쓰는 한국 개발자)과 무관한 카테고리(image/video/audio 등)가 코딩 신호를 희석.
- 홈 메타데이터가 "GitHub 트렌딩 TOP 20" 포지션 — 커모디티. 차별 자산은 큐레이션+해설.

## 작업 1 — `/posts/[id]` 서버 렌더 상세 페이지 (SEO)

### 요구사항
1. **라우트**: `app/posts/[id]/page.tsx` — 서버 컴포넌트.
   - 큐레이션 글: `lib/posts.ts`의 스냅샷 로더 재사용 (`data/curated-posts.json`, id 형식 `CURATED_ID_RE`).
   - 유저 글(Redis): id가 curated 패턴이 아니면 Redis에서 조회. Redis 미설정 시 404 graceful.
   - 존재하지 않는 id → `notFound()`.
2. **generateMetadata**: 글 제목 → `<title>`, body 앞 160자 → description, OG title/description/type=article. 한글 우선(title), `titleEn` 있으면 `alternates` 불필요 — 단일 URL 유지.
3. **generateStaticParams**: 번들된 큐레이션 글 id 목록 반환 + `dynamicParams = true` (유저 글/신규 큐레이션은 on-demand). revalidate 3600 (기존 ISR 관행 유지).
4. **본문 렌더**: 기존 `PostCard` 스타일 재사용하되 상세용 — 제목(h1), 출처 링크(sourceName/sourceUrl), 날짜, body 전문. 언어 토글은 기존 i18n 패턴 따름 (서버 컴포넌트라 어려우면 한글 본문 + 영문 병기 생략 가능, SEO 타깃은 한국어).
5. **피드 연결**: `PostsShell`/`PostCard`에서 각 글 제목 → `/posts/<id>` 링크 (`next/link`). 기존 카드 인터랙션(star/review) 유지.
6. **sitemap**: `app/sitemap.ts` 신설 — 홈, /posts, /tools, 큐레이션 글 전체, `data/weeks/` 주차 페이지 포함.

### 완료 기준
- `npm run build` 성공, 큐레이션 글 상세가 정적 생성됨.
- `curl` 로 상세 페이지 HTML에 글 본문 텍스트가 서버 렌더로 포함 확인.
- 피드에서 글 클릭 → 상세 이동.

## 작업 2 — 포지션 전환: 카피 + 툴 탭 정리 + "왜 떴나" 필드

### 2a. 홈/메타 카피
- `app/layout.tsx` metadata:
  - title: `GitNewStars — 한국어 AI 코딩 브리핑`
  - description: `이번 주 뜨는 GitHub 프로젝트와 AI 코딩 도구 실전 팁을 한국어로. 왜 떴는지까지 5분 안에.`
  - OG 동일 톤 (영문 OG: `Korean AI-coding briefing — trending GitHub repos & daily agent-tool tips`).
- 홈 상단(AppShell/page.tsx)에 노출되는 사이트 태그라인 문구가 있으면 동일 톤으로 교체.

### 2b. AI 툴 탭 — 코딩 수직 전면화
- `ToolsShell.tsx` 카테고리 칩 순서: `coding`, `agents` 최상단. 기본 선택을 `coding`으로.
- 나머지 카테고리(image/video/audio/search/productivity/llm-chat/other)는 "기타 도구" 접힘 섹션 또는 칩 스크롤 후순위로 강등. **데이터 삭제 금지** — `ai-tools.json` 구조 유지, UI만 재배치.

### 2c. "왜 떴나" 해설 필드
- `lib/types.ts` `Overrides` 값에 `whyKo?: string` 추가 (`{ descKo, whyKo?, updatedAt, updatedBy }`).
- `app/api/override` — whyKo 저장 허용 (기존 descKo 흐름과 동일 검증/커밋 경로).
- `RepoCard.tsx` — whyKo 있으면 설명 아래 `왜 떴나 —` 라벨 박스로 표시. 관리자 편집 UI에 whyKo textarea 추가 (기존 descKo 편집 패턴 복제).
- 데이터 병합: `lib/data.ts`(또는 override 병합 지점)에서 whyKo를 RepoView로 전달.
- 하위호환: 기존 overrides.json 항목에 whyKo 없어도 동작.

### 완료 기준
- 빌드 성공. 툴 탭 첫 화면 = 코딩 도구. 관리자 로그인 시 whyKo 입력/저장/표시 확인 가능(로컬은 GH_TOKEN 없으면 저장 스킵 — 읽기 경로만 검증).

## 비범위 (이번에 안 함)
- 뉴스레터, 외부 배포 자동화, `/topics/[slug]`, 유저 제보 폼, 영문 시장.
- ai-tools 데이터 삭제/크롤러 변경.

## 구현 순서
작업 1과 작업 2는 파일 겹침 없음 — 병렬 가능.
- 작업 1: `app/posts/[id]/`, `app/sitemap.ts`, `lib/posts.ts`(조회 헬퍼 추가), `PostsShell/PostCard`(링크만)
- 작업 2: `app/layout.tsx`, `ToolsShell.tsx`, `lib/types.ts`, `lib/data.ts`, `app/api/override/`, `RepoCard.tsx`
