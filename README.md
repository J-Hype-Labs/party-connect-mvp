# PartyConnect (파티커넥트)

**운영 사이트:** https://j-hype-labs.github.io/party-connect-mvp/  
**파티 탐색 페이지:** https://j-hype-labs.github.io/party-connect-mvp/party-connect/  
**저장소:** https://github.com/J-Hype-Labs/party-connect-mvp

PartyConnect는 오프라인 소셜링 파티와 혼술바 등의 파티를 탐색하고 신청하는 웹 서비스 MVP다.

## 현재 상태

기준일: 2026-11-08

| 항목 | 확인된 상태 |
|---|---|
| main SHA | 9949f53567f033e269acc123d47b59cbd22ff254 |
| 프런트엔드 P0 통합 PR #8 | 병합 완료 |
| 공통 Auth 모듈 | main에 추가됨 |
| OAuth callback 페이지 | main에 추가됨 |
| Pages 배포 | Run 42472345956 성공, 위 SHA |
| 최신 CI | Run 42472346425, 확인 시 실행 중 |
| 이전 E2E | SHA 0942af4에서 93/93 PASS |
| 실제 카카오 OAuth | 미검증 |
| 실제 Supabase DB/API | 미검증 |
| 백엔드 PR #1 | OPEN, 미병합 |
| 관리자 권한 보안 | 차단: 메인 HTML에 관리자 비밀번호 상수 존재 |

**중요:** 인증 모듈과 callback 페이지가 추가되었다고 실제 카카오 인증이 완료된 것은 아니다. 현재 Supabase URL/공개 키가 비어 있고, 신규 가입 API와 실제 DB 연결도 확인되지 않았다.

## 주요 기능

- 메인 페이지의 프로모션 배너, 파티·후기 콘텐츠
- 파티커넥트 전용 페이지의 파티 탐색
- 지역·요일·카테고리 필터 및 검색
- 파티 상세 모달, 이미지, 지도 링크
- 파티 신청 폼과 입력 검증
- 공통 인증 모듈: js/auth-client.js, js/auth-service.js, js/auth-ui.js
- 공통 파티 API 모듈: js/party-api.js
- OAuth callback 경로: auth/callback/
- 마이페이지 신청 내역 UI

현재 실제 운영에서 검증된 기능과 코드만 존재하는 기능은 아래 문서의 상태 표를 따른다.

## 기술 구조

- Frontend: React 18 UMD, ReactDOM, Babel Standalone, Tailwind CDN, Lucide, Pretendard
- Auth: Supabase Auth, Kakao OAuth, PKCE
- Backend: Supabase Edge Function, PostgreSQL
- Hosting: GitHub Pages
- CI: GitHub Actions, JSX/HTML validation, Playwright E2E

### 저장소 구조

- index.html: 메인 페이지
- party-connect/index.html: 파티커넥트 전용 페이지
- auth/callback/index.html: OAuth callback 화면
- js/auth-client.js: Supabase client 및 환경 설정
- js/auth-service.js: 로그인, 로그아웃, 세션 및 인증 상태
- js/auth-ui.js: 로그인·가입 동의·오류 UI 컴포넌트
- js/party-api.js: 파티·신청·마이페이지 API 어댑터
- js/party-data.js: 공통 파티 데이터
- tests/: Playwright E2E
- scripts/: JSX/HTML 검증
- docs/: 인증·UI/UX·배포 상세 명세
- .agents/skills/: 설치된 에이전트 스킬과 참조 자료

## 로컬 실행

Node.js 18 이상.

1. npm ci
2. python3 -m http.server 3000
3. 메인: http://localhost:3000/
4. 전용 페이지: http://localhost:3000/party-connect/
5. OAuth callback: http://localhost:3000/auth/callback/

## 테스트

- JSX: npm run validate:jsx
- HTML: npm run validate:html
- 기존 전체 E2E: npm run test:e2e:full
- 전용 페이지: npm run test:party-connect
- 사용자 여정 회귀: npm run test:user-journey
- 인증 테스트 스크립트: npm run test:auth

주의: test:auth 스크립트는 추가되어 있으나 현재 main의 tests/ 아래에 auth-*.spec.js 파일이 확인되지 않는다. 인증 테스트가 실제 실행·통과했다고 표시하지 않는다. 현재 CI workflow에도 test:auth 단계가 연결되어 있지 않다.

이전 main SHA 0942af4의 CI 로그에서는 45 + 42 + 6 = 93개 E2E가 통과했다. 새 Auth 모듈이 추가된 SHA 9949f53의 CI는 이 문서 작성 시점에 실행 중이므로 이전 93 PASS를 새 코드의 검증 결과로 재사용하지 않는다.

## 데모와 실서비스 모드

현재 js/auth-client.js의 동작:

- PARTYLINK_CONFIG URL/공개 키가 비어 있으면 live=false
- localhost는 설정값이 있어도 ?live=1일 때만 live=true
- ?demo=1은 설정이 있어도 live=false로 만들 수 있음
- 현재 main의 Supabase URL/공개 키는 빈 문자열
- live=false에서는 Kakao 로그인 버튼이 비활성화되고 auth-service의 실제 로그인 함수는 오류를 반환함

실제 회원 운영 전에는 production의 demo override를 제거하고, 설정 누락 시 fail-closed 처리하며, 개발/CI mock은 별도 개발 환경에서만 허용해야 한다.

## 현재 인증 구현의 미완료 사항

1. auth-service의 redirectTo는 현재 페이지 URL을 사용한다. callback 페이지를 실제 redirect target으로 연결했는지 확인해야 한다.
2. callback은 신규 가입자를 메인 페이지의 onboarding query로 이동시키지만, 두 페이지에서 가입 동의 화면이 실제로 표시되는지 검증이 필요하다.
3. 프런트엔드가 호출하는 GET /me와 POST /me/onboarding은 백엔드 PR #1의 현재 handler에 구현되어 있지 않다.
4. OnboardingScreen 컴포넌트는 존재하지만 callback/메인/전용 페이지에 연결되었는지 미검증이다.
5. 관리자 비밀번호가 메인 HTML에 남아 있다. 실서비스 데이터 운영 전 서버 측 권한으로 대체해야 한다.

## 문서 안내

전체 문서 지도는 [docs/README.md](docs/README.md)를 확인한다.

- [통합 개발 명세](SPECIFICATION.md)
- [카카오 OAuth 구현 명세](docs/AUTH_IMPLEMENTATION_SPEC.md)
- [인증 UI/UX 명세](docs/AUTH_UI_UX_SPEC.md)
- [인증 배포 체크리스트](docs/AUTH_DEPLOYMENT_CHECKLIST.md)
- [전용 페이지 구현 명세](PARTY_CONNECT_PAGE_IMPLEMENTATION_SPEC.md)
- [UI/UX 결정 기록](UI_UX_DECISION_RECORD.md)
- [ELI10 현황 보고](ELI10_REPORT.md)

## 운영 범위 경계

PartyConnect는 카카오 계정 인증과 파티 신청을 처리한다. 회원 인증을 위해 생년월일·나이·연령 확인 정보를 수집하거나 연령 확인 기능을 제공하지 않는다. 성인 여부와 신분증 확인은 파티 현장 운영자가 담당한다.
