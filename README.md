# GitNewStars ⭐

이번 주 GitHub에서 **가장 많은 신규 스타**를 받은 오픈소스 프로젝트 TOP 10을 일반 사용자에게 소개하는 웹사이트입니다.
A website that introduces the top 10 GitHub projects that gained the most new stars this week.

## 주요 기능 / Features

- 📈 `github.com/trending?since=weekly` 스크래핑 → **이번 주 신규 스타 기준 내림차순** TOP 10
- 🇰🇷 한국어 선택 시 **설명도 한글로** (자동 번역 초안) — 한/영 토글
- 🔐 **관리자(Google 로그인)** 가 한글 설명을 인앱에서 직접 수정 → GitHub에 커밋되어 영구 반영
- 🗂️ 왼쪽 **주간 히스토리 사이드바** — 매주 자동 스냅샷으로 과거 주차의 순위를 다시 조회
- ⚡ ISR(1시간 캐싱) — Vercel **무료 tier**에 최적화
- 🎨 반응형 다크 테마 UI

## 기술 스택 / Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Auth.js (next-auth v5) — Google OAuth
- cheerio — HTML 파싱
- GitHub Actions — 주간 스냅샷 / GitHub Contents API — 데이터 저장소

## 동작 구조 / Architecture

```
이번 주 (현재)   →  런타임 스크래핑(ISR 1h) + 한글 자동번역 + 관리자 오버라이드 병합
관리자 수정      →  /api/override (admin 전용) → GitHub data/overrides.json 커밋
주간 히스토리    →  매주 월요일 GitHub Action → data/weeks/<week>.json 커밋 → 사이드바 표시
```

- 데이터 저장소 = **GitHub 리포지토리 자체** (별도 DB 불필요)
  - `data/overrides.json` — 관리자가 수정한 한글 설명
  - `data/weeks/<ISO주차>.json` — 주간 top10 스냅샷 아카이브

## 로컬 실행 / Local development

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 설정 참고)
npm run dev                  # http://localhost:3000
```

> 환경변수 없이도 사이트는 동작합니다(현재 주 + 자동번역). 로그인/편집/히스토리는
> 아래 환경변수를 설정해야 활성화됩니다.

## 필수 설정 / Setup

### 1. Google OAuth (관리자 로그인)
[Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → OAuth client ID (Web)**

- Authorized redirect URIs 에 추가:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://<배포도메인>/api/auth/callback/google`
- 발급된 Client ID / Secret 을 환경변수로:
  - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- 시크릿 생성: `npx auth secret` → `AUTH_SECRET`
- `ADMIN_EMAIL=yjs@lnrgame.com` (이 계정만 수정 가능)

### 2. 데이터 저장소 / GitHub
- `GH_DATA_REPO=<깃허브유저>/GitNewStars` (보통 배포 리포와 동일)
- `GH_TOKEN` = Fine-grained PAT, 해당 리포에 **Contents: Read and write** 권한
  - 인앱 편집(오버라이드 커밋)에만 필요. 미설정 시 사이트는 읽기 전용으로 정상 동작
- 공개 리포면 히스토리 읽기는 토큰 없이도 가능

### 3. 주간 히스토리 자동화
`.github/workflows/snapshot.yml` 이 **매주 월요일(UTC) 자동 실행**되어 지난 주 스냅샷을
`data/weeks/`에 커밋합니다. 별도 설정 불필요 (기본 `GITHUB_TOKEN` 사용).
즉시 한 번 만들려면 Actions 탭에서 **Run workflow** (workflow_dispatch).

## Vercel 배포 / Deploy

1. 이 폴더를 GitHub 저장소로 푸시
2. [vercel.com](https://vercel.com) → New Project → 저장소 선택 (Next.js 자동 감지)
3. **Environment Variables** 에 위 값들 입력:
   `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAIL`,
   `GH_DATA_REPO`, `GH_TOKEN`
4. **Deploy** → 배포 도메인을 Google OAuth redirect URI 에도 추가

## 참고 / Notes

- "주간 스타 증가량"은 GitHub 공식 API에 없어 Trending HTML을 파싱합니다.
  GitHub이 구조를 바꾸면 `lib/trending.ts` 셀렉터를 업데이트하세요.
- 한글 설명은 무료 번역 엔드포인트 기반 **초안**이며, 관리자가 다듬는 것을 전제로 합니다.
- 아카이브 페이지(과거 주차)는 스냅샷 시점의 한글 설명을 그대로 보존합니다.
