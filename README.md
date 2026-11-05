# Party Connect (파티커넥트) MVP

🔗 **라이브 데모:** https://j-hype-labs.github.io/party-connect-mvp/

> **현재 상태:** 프론트엔드 프로토타입. 카카오 실제 OAuth 로그인은 P0 구현 대상이며 아직 완료로 간주하지 않는다. 네이버 로그인은 제품 범위에서 제외한다.

[lumiconnect.cloud](https://www.lumiconnect.cloud) 서비스를 벤치마킹하여 제작한 2030 오프라인 소셜링 파티 & 혼술바 예약 플랫폼 MVP입니다.

## ✨ 주요 기능
- **히어로 프로모션 배너**: 자동 슬라이드, 일시정지/재생 컨트롤
- **다차원 실시간 필터링**:
  - 지역 선택 모달 (서울 17개 구역, 경기/인천, 지방 세부 지역)
  - 요일별 필터 (월~일)
  - 카테고리 필터 (혼술바, 소개팅, 소셜파티)
- **실시간 인터랙션**:
  - 찜하기 (❤️ 하트 토글 및 토스트 알림) — `localStorage`에 저장되어 새로고침 후에도 유지
  - 파티 상세 모달 (일정·정원·주소·남은 자리, 이미지 갤러리)
  - 무료 체험단 신청 폼 (이름·연락처·요일·개인정보 동의, 유효성 검사, 접수 완료 화면)
- **후기**: 샘플 후기 그리드, 전체보기/접기 토글 (실제 방문·작성자 검증은 미구현)
- **접근성/UX**: ESC·배경 클릭으로 모달 닫기, 모달 열림 시 스크롤 잠금, ARIA 속성, 키보드 탐색
- **반응형 디자인**: 모바일 및 데스크톱 맞춤형 UI/UX (Pretendard 폰트 + Tailwind CSS)

## 🔐 인증 구현 우선순위 (P0)

- 실제 카카오 OAuth 로그인, Auth 사용자 생성/조회, 세션 복원, 로그아웃을 운영 URL에서 검증한다.
- 네이버 로그인 UI와 mock 분기는 제거한다.
- 구현 상세와 제호 DB 연동 계약은 [KAKAO_LOGIN_IMPLEMENTATION_SPEC.md](./KAKAO_LOGIN_IMPLEMENTATION_SPEC.md)를 따른다.
- Kakao Client Secret 및 Supabase service_role key를 공개 프론트엔드에 포함하지 않는다.

## 🛠️ 기술 스택
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Pretendard
- **Design Intelligence**: UI/UX Pro Max
- **Deployment**: GitHub Pages (main 브랜치 push 시 자동 배포)
- **CI/CD**: GitHub Actions (JSX 문법 검증, HTML 구조 검증, 외부 의존성 검증, 배포 검증, Playwright E2E)

## 🚀 로컬 실행 방법
```bash
# 로컬 파이썬 웹서버 실행
python3 -m http.server 3000
```
브라우저에서 `http://localhost:3000`으로 접속합니다.

## 📦 배포
`main` 브랜치에 push하면 GitHub Pages에 자동으로 반영됩니다.

- 배포 URL: https://j-hype-labs.github.io/party-connect-mvp/
- 개발용 파일(`*.png`, `SPECIFICATION.md`, `start.sh`, `.agents`)은 `_config.yml`의 `exclude` 설정으로 배포에서 제외됩니다.
- 배포 상태 확인: `https://api.github.com/repos/J-Hype-Labs/party-connect-mvp/pages/builds/latest`

## 🧪 CI/CD 파이프라인
```yaml
# .github/workflows/ci.yml
```
- **Validate Job**: HTML 구조 검증, JSX 문법 검증(@babel/parser + Python 괄호 균형), 외부 CDN 의존성 확인, 배포 설정 검증
- **E2E Browser Tests**: Playwright Chromium + Mobile Chrome + WebKit 로컬 서버 테스트 (기본 로드, 요소 탐색, 필수 기능 검증)
- **Deploy-Check Job**: GitHub Pages 배포 대기, 라이브 URL 접근성 확인(HTTP 200), 콘텐츠 렌더링 검증

## 📋 주요 변경 이력
- **2026-11-05**: P0 배포 안정화 완료 - GitHub Actions CI 파이프라인 통과(PR #1: `0856818`, main: `d40258a`), JSX 문법 검증 자동화(@babel/parser), Playwright E2E 필수 실행(Chromium 15/15, Mobile Chrome 15/15), 운영 URL HTTP 200 확인, Pages 배포 성공(CI Run 41968324010 전체 PASS)
- **2026-11-04**: 관리자 대시보드 구현 (파티/신청/후기 관리, 통계)
- **2026-11-04**: Phase 2 사용자 기능 UI 추가 (mock 소셜 로그인 UI, 알림센터, 후기 작성, 마이페이지, 지도 모달; 실제 OAuth 미연동)
- **2026-11-03**: MVP 핵심 기능 완성 (필터링, 찜하기, 상세 모달, 후기 시스템)

## ✅ P0 검증 결과 요약 (2026-11-05)

| 검증 항목 | 도구 | 결과 | 비고 |
|-----------|------|------|------|
| JSX 문법 (@babel/parser) | Node.js | ✅ PASS | `npm run validate:jsx` |
| JSX 문법 (괄호 균형) | Python | ✅ PASS | `scripts/validate-jsx-ci.py` |
| HTML 구조 (필수 요소) | grep | ✅ PASS | root, babel, ReactDOM, App, CDNs |
| 외부 CDN 의존성 | curl | ✅ PASS | 5개 CDN 모두 200/302 응답 |
| 배포 설정 | file check | ✅ PASS | _config.yml, .gitignore, .nojekyll |
| Playwright E2E - 기본 로드 | Chromium | ✅ PASS | Run ID: 41935871955 |
| Playwright E2E - 요소 탐색 | Chromium | ✅ PASS | 버튼/섹션/한국어 텍스트 확인 |
| Playwright E2E - 필수 기능 | Chromium | ✅ PASS | 루트/한국어/히어로/필터 버튼 |
| Playwright E2E - 신청 플로우 | Chromium | ✅ PASS | 폼 입력→제출→완료 메시지 |
| Playwright E2E - 모달/필터 | Chromium | ✅ PASS | 열기/닫기/ESC/배경클릭/탭 |
| Playwright E2E - 모바일(390px) | Mobile Chrome | ✅ PASS | 15/15 테스트 통과 |
| Playwright E2E - 가로스크롤 | Mobile Chrome | ✅ PASS | body.scrollWidth ≤ 410px |
| Playwright E2E - JS 에러 검사 | Chromium | ✅ PASS | 크리티컬 에러 0개 |
| GitHub Actions Validate | ubuntu-latest | ✅ PASS | 전체 검증 통과 (10s) |
| GitHub Actions E2E | ubuntu-latest | ✅ PASS | Chromium 전체 통과 (8m6s) |
| GitHub Pages 배포 | Pages workflow | ✅ PASS | main 브랜치 배포 성공 (Run 41968324010 Deploy-Check 검증)
| 운영 URL 접근성 | curl | ✅ PASS | HTTP 200 |
| 운영 URL 콘텐츠 | curl + grep | ✅ PASS | #root, text/babel, 파티커넥트 |

**최종 검증 커밋 (PR #1)**: `0856818` (HEAD of `fix/p0-assert-real-flows`) - CI Validate + E2E 통과
**main 브랜치 최신 검증 커밋**: `d40258a` - CI 전체 통과(Validate + E2E + Deploy-Check), Pages 배포 성공(Run 41968324010)

---

### ⚠️ 검증 범위 한계 (반드시 인지)
| 항목 | 현재 상태 |
|------|-----------|
| 지역 필터 결과 변화 | **미검증** (탭 선택 UI만 확인) |
| 관리자 로그인/CRUD | **미검증** (모달 진입만 확인) |
| 검색어 입력/결과 | **미검증** (진입점 버튼만 확인) |
| 파티 카드 필드 상세 | **미검증** (카드 존재/가시성만 확인) |
| 카테고리/요일 필터 결과 | **미검증** (탭 버튼 존재만 확인) |
| 찜/후기/마이페이지/지도/알림/소셜로그인 | **미검증** (UI 존재 여부만) |
| WebKit(Safari) 개별 PASS/FAIL | **분리 집계 필요** (CI에 WebKit 설치됨, skip 분리 필요) |
| 320/768/1280px 해상도 | **미검증** (390px만 검증) |
| 동일 SHA Pages 배포 검증 | **부분 검증** (CI와 Pages의 SHA 대조 별도 확인 필요) |