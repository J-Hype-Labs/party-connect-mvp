# Party Connect (파티커넥트) MVP

🔗 **라이브 데모:** https://j-hype-labs.github.io/party-connect-mvp/
🔗 **파티커넥트 전용 페이지:** https://j-hype-labs.github.io/party-connect-mvp/party-connect/

[lumiconnect.cloud](https://www.lumiconnect.cloud) 서비스를 벤치마킹하여 제작한 2030 오프라인 소셜링 파티 & 혼술바 예약 플랫폼 MVP입니다.

## ✨ 주요 기능
- **히어로 프로모션 배너**: 자동 슬라이드, 일시정지/재생 컨트롤 (메인 페이지)
- **파티커넥트 전용 페이지** (`/party-connect/`): 독립적인 파티 탐색·검색·신청 플로우
- **다차원 실시간 필터링**:
  - 지역 선택 모달 (서울 17개 구역, 경기/인천, 지방 세부 지역)
  - 요일별 필터 (월~일) — 가로 스크롤 칩 UI
  - 카테고리 필터 (혼술바, 소개팅, 소셜파티)
  - 검색 (제목·업체명·지역 AND 조합)
- **실시간 인터랙션**:
  - 찜하기 (❤️ 하트 토글 및 토스트 알림) — `localStorage`에 저장되어 새로고침 후에도 유지
  - 파티 상세 모달 (일정·정원·주소·남은 자리, 이미지 갤러리, 지도 보기)
  - 파티 신청 폼 (이름·연락처·요일·개인정보 동의, 유효성 검사, 접수 완료 화면)
  - 중복 신청 방지, 새로고침 후 상태 유지
- **인증 시스템 (PARTYLINK)**:
  - 데모 모드: 모의 카카오 로그인 (localStorage 기반)
  - 실서비스 모드: Supabase + 카카오 OAuth (PKCE) + Edge Function API
  - 세션 복원 (`onAuthStateChange`), 로그인 상태 페이지 간 공유
- **마이페이지**: 신청 내역 조회, 상태 표시(대기/승인/취소), 취소 기능, 방문 코드 표시
- **후기**: 검증된 실제후기 그리드, 전체보기/접기 토글 (메인 페이지)
- **접근성/UX**: ESC·배경 클릭으로 모달 닫기, 모달 열림 시 스크롤 잠금, ARIA 속성, 키보드 탐색, 44×44px 터치 타겟
- **반응형 디자인**: 모바일 및 데스크톱 맞춤형 UI/UX (Pretendard 폰트 + Tailwind CSS)
- **UI/UX Pro Max 디자인 시스템**: Vibrant & Block-based + Hero-Centric 패턴, 브랜드 컬러 rose-600 유지

## 🛠️ 기술 스택
- **Frontend**: React 18 (CDN + Babel), Tailwind CSS, Lucide Icons, Pretendard
- **Auth/DB**: Supabase (카카오 OAuth PKCE), Edge Function (`partylink-api`)
- **Design Intelligence**: UI/UX Pro Max
- **Deployment**: GitHub Pages (main 브랜치 push 시 자동 배포) — 정적 라우팅으로 `/party-connect-mvp/party-connect/` 서빙
- **CI/CD**: GitHub Actions (JSX 문법 검증, HTML 구조 검증, 외부 의존성 검증, 배포 검증, Playwright E2E 3개 스위트 × 3 브라우저)

## 📁 프로젝트 구조
```
party-connect-mvp/
├── index.html                    # 메인 페이지 (배너, 후기, 관리자 등)
├── party-connect/
│   └── index.html                # 파티커넥트 전용 페이지 (탐색·검색·신청)
├── js/
│   └── party-data.js             # 공통 파티 데이터 (PARTY_LIST, REGION_CATEGORIES, DAYS, CATEGORIES)
├── tests/
│   ├── comprehensive.spec.js           # 메인 페이지 E2E (15개)
│   ├── party-connect-page.spec.js      # 전용 페이지 E2E (9개)
│   └── user-journey-regression.spec.js # PR #6 회귀 테스트 (2개)
├── scripts/
│   ├── validate-jsx.js            # @babel/parser 기반 JSX 검증 (메인 + 전용)
│   └── validate-html.js           # HTML 구조 검증
├── .github/workflows/ci.yml       # CI 파이프라인 (3개 테스트 스위트 실행)
├── playwright.config.js           # Playwright 설정
└── package.json
```

## 🚀 로컬 실행 방법
```bash
# 의존성 설치
npm ci

# 로컬 파이썬 웹서버 실행 (포트 3000)
python3 -m http.server 3000
```
브라우저에서 `http://localhost:3000` (메인) 또는 `http://localhost:3000/party-connect/` (전용 페이지)로 접속합니다.

**데모/실서비스 모드:**
- 기본은 **데모 모드** (localStorage 기반, Supabase 키 비어있음)
- 실서비스 모드: `?live=1` 파라미터 + `PARTYLINK_CONFIG` 설정 시 활성화
- 로컬호스트에서는 `?live=1` 필요, 배포 환경에서는 키 설정 시 자동 실서비스 모드
- 데모 강제: `?demo=1`

## 📦 배포
`main` 브랜치에 push하면 GitHub Pages에 자동으로 반영됩니다.

- 배포 URL: https://j-hype-labs.github.io/party-connect-mvp/
- 전용 페이지 URL: https://j-hype-labs.github.io/party-connect-mvp/party-connect/
- 개발용 파일(`*.png`, `SPECIFICATION.md`, `start.sh`, `.agents`)은 `_config.yml`의 `exclude` 설정으로 배포에서 제외됩니다.
- 배포 상태 확인: `https://api.github.com/repos/J-Hype-Labs/party-connect-mvp/pages/builds/latest`

## 🧪 CI/CD 파이프라인
```yaml
# .github/workflows/ci.yml
```
- **Validate Job**: HTML 구조 검증, JSX 문법 검증(@babel/parser — 메인 + 전용), 외부 CDN 의존성 확인, 배포 설정 검증
- **E2E Browser Tests** (Chromium, Mobile Chrome, WebKit):
  - `tests/comprehensive.spec.js` — 메인 페이지 (15 테스트)
  - `tests/party-connect-page.spec.js` — 전용 페이지 (9 테스트)
  - `tests/user-journey-regression.spec.js` — 회귀 테스트 (2 테스트)
- **Deploy-Check Job** (main push만): GitHub Pages 배포 대기, 라이브 URL 접근성 확인(HTTP 200), 콘텐츠 렌더링 검증

**로컬 테스트 실행:**
```bash
# 메인 페이지 테스트
npm run test:party-connect  # 또는: npx playwright test tests/party-connect-page.spec.js --reporter=list

# 회귀 테스트
npm run test:user-journey

# 전체 E2E (CI와 동일)
CI=true PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test tests/comprehensive.spec.js tests/party-connect-page.spec.js tests/user-journey-regression.spec.js --reporter=list

# JSX/HTML 검증
npm run validate:jsx && npm run validate:html
```

## 📋 주요 변경 이력
- **2026-11-07**: P0 통합 QA 2차 수정 — 모달 강제 클릭 제거, PARTYLINK Supabase 인증 통합, 공통 데이터 단일화, 마이페이지/지도/네이버 버튼 수정, 3개 테스트 스위트 CI 통합, 문서 갱신
- **2026-11-05**: P0 배포 안정화 완료 - GitHub Actions CI 파이프라인 통과(PR #1: `0856818`, main: `d40258a`), JSX 문법 검증 자동화(@babel/parser), Playwright E2E 필수 실행(Chromium 15/15, Mobile Chrome 15/15), 운영 URL HTTP 200 확인, Pages 배포 성공(CI Run 41968324010 전체 PASS)
- **2026-11-04**: 관리자 대시보드 구현 (파티/신청/후기 관리, 통계)
- **2026-11-04**: Phase 2 사용자/소셜 기능 추가 (소셜 로그인, 알림센터, 후기 작성, 마이페이지, 지도 모달)
- **2026-11-03**: MVP 핵심 기능 완성 (필터링, 찜하기, 상세 모달, 후기 시스템)

## ✅ P0 검증 결과 요약 (2026-11-07 업데이트)

| 검증 항목 | 도구 | 결과 | 비고 |
|-----------|------|------|------|
| JSX 문법 (@babel/parser) | Node.js | ✅ PASS | 메인 + 전용 페이지 (`npm run validate:jsx`) |
| JSX 문법 (괄호 균형) | Python | ✅ PASS | `scripts/validate-jsx-ci.py` |
| HTML 구조 (필수 요소) | grep | ✅ PASS | root, babel, ReactDOM, App, CDNs |
| 외부 CDN 의존성 | curl | ✅ PASS | 5개 CDN 모두 200/302 응답 |
| 배포 설정 | file check | ✅ PASS | _config.yml, .gitignore, .nojekyll |
| **Playwright E2E - 메인 페이지** | **Chromium** | ✅ **PASS** | **15/15 테스트 통과** |
| **Playwright E2E - 전용 페이지** | **Chromium** | ✅ **PASS** | **9/9 테스트 통과** |
| **Playwright E2E - 회귀 테스트** | **Chromium** | ✅ **PASS** | **2/2 테스트 통과** |
| **Playwright E2E - 메인 페이지** | **Mobile Chrome** | ✅ **PASS** | **15/15 테스트 통과** |
| **Playwright E2E - 전용 페이지** | **Mobile Chrome** | ✅ **PASS** | **9/9 테스트 통과** |
| **Playwright E2E - 회귀 테스트** | **Mobile Chrome** | ✅ **PASS** | **2/2 테스트 통과** |
| Playwright E2E - WebKit | WebKit | ⚠️ 부분 | 일부 timeout/skip, 원인 분석 필요 |
| GitHub Actions Validate | ubuntu-latest | 🔄 대기 중 | PR 생성 후 실행 예정 |
| GitHub Actions E2E (3 스위트) | ubuntu-latest | 🔄 대기 중 | PR 생성 후 실행 예정 |
| GitHub Pages 배포 | Pages workflow | 🔄 대기 중 | main 병합 후 실행 예정 |

**핵심 수정 사항 (이번 PR):**
1. **모달 강제 클릭 제거**: `force: true` 완전 제거, 실제 사용자 클릭으로 모달 열기/닫기 검증
2. **중첩 버튼 구조 개선**: 카드 이미지/제목 영역만 `role="button"`, 찜·신청 버튼은 별도 인터랙티브 요소로 분리
3. **PARTYLINK 모듈 통합**: Supabase Auth(PKCE), Edge Function API, 데모/실서비스 모드 분기
4. **공통 파티 데이터 단일화**: `js/party-data.js`를 메인/전용 페이지가 동일하게 사용
5. **마이페이지 기능 연결**: 신청 내역 조회, 상태 표시, 취소, 방문 코드 표시
6. **지도 버튼 수정**: `openMap()` 함수 구현 (카카오맵 링크)
7. **네이버 로그인 버튼 제거**: 미지원 기능 정리
8. **데모/실서비스 메시지 구분**: 신청 완료 시 모드별 다른 안내 메시지
9. **CI 통합**: 3개 테스트 스위트 모두 실행, JSX 검증 메인+전용 페이지 적용

---

### ⚠️ 검증 범위 한계 (반드시 인지)
| 항목 | 현재 상태 |
|------|-----------|
| 지역 필터 결과 변화 정확성 | **미검증** (탭 선택 UI만 확인, 결과 데이터 비교 미구현) |
| 관리자 로그인/CRUD | **미검증** (모달 진입만 확인) |
| 검색어 입력/결과 정확성 | **미검증** (진입점 버튼만 확인) |
| 파티 카드 필드 상세 | **미검증** (카드 존재/가시성만 확인) |
| 카테고리/요일 필터 결과 정확성 | **미검증** (탭 버튼 존재만 확인) |
| 찜/후기/마이페이지/지도/알림/소셜로그인 | **일부 검증됨** (UI 플로우 검증, 실제 데이터 동기화는 실서비스에서 확인 필요) |
| WebKit(Safari) 개별 PASS/FAIL | **분리 집계 필요** (일부 timeout, 환경 이슈 분석 중) |
| 320/768/1280px 해상도 | **미검증** (390px만 검증) |
| 동일 SHA Pages 배포 검증 | **대기 중** (main 병합 후 확인 필요) |
| **실제 카카오 OAuth / Supabase 연동** | **미검증** (데모 모드만 확인, 운영 키 설정 후 별도 검증 필요) |
| **Edge Function `partylink-api` 배포** | **미완료** (백엔드 저장소 partylink PR #1 병합 후 필요) |