# PartyConnect (파티커넥트)

**운영 사이트:** https://j-hype-labs.github.io/party-connect-mvp/  
**파티 탐색 페이지:** https://j-hype-labs.github.io/party-connect-mvp/party-connect/  
**저장소:** https://github.com/J-Hype-Labs/party-connect-mvp

PartyConnect는 오프라인 소셜링 파티와 혼술바 등의 파티를 탐색하고 신청하는 웹 서비스 MVP다.

## 현재 상태

기준일: 2026-11-08

| 항목 | 확인된 상태 |
|---|---|
| 프런트엔드 main | 0942af408d1221ec7225f9add4c996929ccdaef5 |
| PR #8 통합 | 병합 완료 |
| main CI | 성공, Run 42409901830 |
| GitHub Pages | 성공, Run 42409901461 |
| 배포 SHA | main SHA와 동일 |
| E2E | 93/93 PASS: 45 + 42 + 6 |
| 실제 카카오 OAuth | 미검증 |
| 실제 Supabase DB/API | 미검증 |
| 백엔드 연동 PR #1 | OPEN, 미병합 |
| 관리자 권한 보안 | 미완료: 프런트엔드에 관리자 비밀번호 상수 존재 |

**중요:** 프런트엔드 코드에는 Supabase Auth와 Kakao OAuth 호출이 있으나, 현재 두 페이지의 PARTYLINK_CONFIG URL/공개 키가 비어 있다. 따라서 현재 코드 경로는 데모 모드다. 실제 카카오 계정 로그인이나 운영 DB 신청이 검증되었다는 뜻이 아니다.

실제 OAuth와 DB 연동을 진행할 때는 [인증 배포 체크리스트](docs/AUTH_DEPLOYMENT_CHECKLIST.md)를 따른다. 실제 회원 데이터를 받기 전에 관리자 인증을 서버 측 권한으로 전환해야 한다.

## 주요 기능

- 메인 페이지의 프로모션 배너, 파티·후기 콘텐츠
- 파티커넥트 전용 페이지의 파티 탐색
- 지역·요일·카테고리 필터 및 검색
- 파티 상세 모달, 이미지, 지도 링크
- 파티 신청 폼과 입력 검증
- 데모 환경의 localStorage 기반 로그인·신청 상태
- 코드상 Supabase Auth(Kakao OAuth PKCE) 및 PartyLink API 연결 경로
- 마이페이지 신청 내역, 상태 표시, 취소 UI
- 반응형 UI 및 키보드·모달 접근성

기능의 실제 운영 여부는 현재 상태 표와 ELI10 보고서를 기준으로 판단한다.

## 기술 구조

- Frontend: React 18 UMD, ReactDOM, Babel Standalone, Tailwind CDN, Lucide, Pretendard
- Auth: Supabase Auth, Kakao OAuth, PKCE
- Backend: Supabase Edge Function, PostgreSQL
- Hosting: GitHub Pages
- CI: GitHub Actions, JSX/HTML validation, Playwright E2E

### 저장소 구조

- index.html: 메인 페이지
- party-connect/index.html: 파티커넥트 전용 페이지
- js/party-data.js: 메인·전용 페이지가 공유하는 파티 데이터
- tests/: Playwright E2E
- scripts/: JSX/HTML 검증
- docs/: 인증 구현·UI/UX·배포 상세 명세
- .agents/skills/: 설치된 에이전트 스킬과 참조 자료

## 로컬 실행

Node.js 18 이상을 사용한다.

1. 의존성 설치: npm ci
2. 로컬 정적 서버 실행: python3 -m http.server 3000
3. 메인: http://localhost:3000/
4. 전용 페이지: http://localhost:3000/party-connect/

## 테스트

- JSX: npm run validate:jsx
- HTML: npm run validate:html
- 전체 E2E: npm run test:e2e:full
- 전용 페이지: npm run test:party-connect
- 사용자 여정 회귀: npm run test:user-journey

CI의 현재 E2E 구성:

| 스위트 | 브라우저별 테스트 | 브라우저 수 | 총 실행 |
|---|---:|---:|---:|
| comprehensive.spec.js | 15 | 3 | 45 |
| party-connect-page.spec.js | 14 | 3 | 42 |
| user-journey-regression.spec.js | 2 | 3 | 6 |
| 합계 | 31 | 3 | 93 |

기준 main CI 로그에서는 93개 테스트가 모두 통과했다. 이는 해당 시점의 테스트 범위에 대한 결과이며 실제 OAuth, 실제 DB, 관리자 보안 또는 전체 운영 UI 감사를 증명하지 않는다.

## 데모와 실서비스 모드

현재 소스 동작:

- PARTYLINK_CONFIG URL/공개 키가 비어 있으면 데모 모드
- localhost에서는 설정값이 있어도 ?live=1이 있어야 실서비스 모드
- ?demo=1은 현재 코드에서 데모 모드를 강제할 수 있음
- GitHub Pages의 현재 설정값은 비어 있음

이것은 현재 코드의 동작 설명이다. 실제 회원을 받기 전에는 운영 환경에서 URL 파라미터로 데모 모드를 강제할 수 없게 하고, 설정 누락 시 fail-closed로 동작하도록 수정해야 한다.

## 문서 안내

문서의 전체 목록과 기준은 [docs/README.md](docs/README.md)를 확인한다.

- [통합 개발 명세](SPECIFICATION.md)
- [카카오 OAuth 구현 명세](docs/AUTH_IMPLEMENTATION_SPEC.md)
- [인증 UI/UX 명세](docs/AUTH_UI_UX_SPEC.md)
- [인증 배포 체크리스트](docs/AUTH_DEPLOYMENT_CHECKLIST.md)
- [전용 페이지 구현 명세](PARTY_CONNECT_PAGE_IMPLEMENTATION_SPEC.md)
- [UI/UX 결정 기록](UI_UX_DECISION_RECORD.md)
- [ELI10 현황 보고](ELI10_REPORT.md)

## 관련 저장소와 PR

- 프런트엔드 PR #8: 병합 완료
- 프런트엔드 PR #3, #5, #6, #7: 2026-11-08 확인 시 OPEN. PR #8에 코드가 포함되었다고 추정해 임의 종료하지 않는다.
- 프런트엔드 PR #4: 병합 완료
- 백엔드 저장소: https://github.com/J-Hype-Labs/partylink
- 백엔드 연동 PR #1: 2026-11-08 확인 시 OPEN

PR 상태는 변경될 수 있으므로 병합 전 GitHub에서 다시 확인한다.

## 운영 범위 경계

PartyConnect는 회원 인증과 파티 신청을 처리한다. 회원 인증을 위해 생년월일·나이·연령 확인 정보를 수집하거나 연령 확인 기능을 제공하지 않는다. 성인 여부와 신분증 확인은 파티 현장 운영자가 담당한다.

실제 OAuth·DB 연동, 관리자 권한, 개인정보 처리 정책은 별도 운영 승인과 검증을 거쳐야 한다.
