# PartyConnect ELI10 현황 보고

- 기준일: 2026-11-08
- 기준 main: 0942af408d1221ec7225f9add4c996929ccdaef5
- 범위: 프런트엔드 P0 통합·배포 현황 및 실서비스 인증 준비 상태

## 1. 한 줄 결론

**파티커넥트 화면 통합과 프런트엔드 배포는 완료됐다. 실제 카카오 로그인과 운영 DB 연결은 아직 검증되지 않았다.**

## 2. 배포 증거

| 항목 | 결과 |
|---|---|
| PR #8 | 병합 완료 |
| main SHA | 0942af408d1221ec7225f9add4c996929ccdaef5 |
| main CI | Run 42409901830 성공 |
| Pages 배포 | Run 42409901461 성공 |
| Pages 배포 SHA | 0942af408d1221ec7225f9add4c996929ccdaef5 |
| CI/E2E | 93/93 PASS, FAIL 0, SKIP 0 |

링크:
- PR #8: https://github.com/J-Hype-Labs/party-connect-mvp/pull/8
- CI: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42409901830
- Pages: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42409901461
- 메인: https://j-hype-labs.github.io/party-connect-mvp/
- 전용 페이지: https://j-hype-labs.github.io/party-connect-mvp/party-connect/

E2E 로그 세부:
- comprehensive.spec.js: 15개 × 3 브라우저 = 45 PASS
- party-connect-page.spec.js: 14개 × 3 브라우저 = 42 PASS
- user-journey-regression.spec.js: 2개 × 3 브라우저 = 6 PASS
- 총 93 PASS

Deploy-Check는 정적 페이지의 접근성과 기본 콘텐츠를 확인한다. 이 결과를 실제 카카오 OAuth나 운영 DB 브라우저 테스트로 해석하면 안 된다.

## 3. 사용자에게 보이는 변경

- 체험단·러브커넥트 독립 메뉴 제거
- 파티커넥트 전용 페이지 연결
- 네이버 로그인 제거, 카카오 로그인 진입점 유지
- 검색·요일·지역·카테고리 UI
- 파티 상세 모달과 신청 흐름
- 마이페이지 신청 내역 UI
- 메인/전용 페이지 공통 파티 데이터 사용

## 4. 실제 인증 상태

프런트엔드에 Supabase Auth와 Kakao OAuth PKCE 호출 코드가 존재한다. 그러나 다음 이유로 실제 인증 완료가 아니다.

1. 메인과 전용 페이지의 PARTYLINK_CONFIG URL/공개 키가 비어 있다.
2. 설정값이 없어 현재 코드가 데모 모드로 실행된다.
3. 카카오 개발자 콘솔 및 Supabase Provider 설정은 검증되지 않았다.
4. 백엔드 PR #1은 아직 main에 병합되지 않았다.
5. 실제 OAuth 계정으로 로그인·로그아웃·재접속 테스트가 수행되지 않았다.

따라서 현재 회원 로그인과 신청 저장을 실제 서비스 기능으로 광고하거나 운영하면 안 된다.

## 5. 보안상 남은 차단 항목

- 메인 index.html에 ADMIN_PASSWORD 상수가 남아 있다.
- 관리자 인증은 브라우저의 비밀번호 비교 방식이며 서버 권한 검증으로 대체되지 않았다.
- 운영 환경에서 URL 파라미터로 데모 모드를 강제하는 코드 경로가 있다.
- 실제 DB migration 및 RLS 적용 상태가 확인되지 않았다.
- 실제 Edge Function 배포가 확인되지 않았다.
- 회원 가입 동의 이력의 영속 저장이 구현·검증되지 않았다.

실제 회원 데이터를 받기 전에 관리자 인증을 서버 측 role로 전환하고, 운영 환경의 demo fallback을 차단해야 한다.

## 6. PR 상태 스냅샷

2026-11-08 GitHub 확인:

| 저장소 | PR | 상태 | 내용 |
|---|---:|---|---|
| party-connect-mvp | #3 | OPEN | 카카오 로그인 명세 |
| party-connect-mvp | #4 | MERGED | 전용 페이지 관련 문서 |
| party-connect-mvp | #5 | OPEN | Supabase/Kakao 프런트 통합 작업 |
| party-connect-mvp | #6 | OPEN | 사용자 여정 회귀 테스트 |
| party-connect-mvp | #7 | OPEN | 통합 감사 문서 |
| party-connect-mvp | #8 | MERGED | P0 통합 프런트엔드 |
| partylink | #1 | OPEN | DB migration 및 Edge Function 연동 |

PR #5/#6/#7이 PR #8에 일부 또는 전부 반영되었는지는 파일별 diff로 판단한다. OPEN PR을 중복이라는 이유만으로 임의 종료하지 않는다.

## 7. 인증 다음 작업

세부 구현은 docs/AUTH_IMPLEMENTATION_SPEC.md, 화면은 docs/AUTH_UI_UX_SPEC.md, 콘솔 설정은 docs/AUTH_DEPLOYMENT_CHECKLIST.md를 따른다.

우선순위:

1. 백엔드 PR #1 코드·migration 리뷰 및 병합
2. Supabase Kakao Provider와 Redirect URI 설정
3. 회원 약관 동의 이력 API/DB 설계 및 구현
4. 공통 Auth 모듈과 callback/세션 복원 안정화
5. 실제 신청·조회·취소 통합 테스트
6. 회원 간 데이터 격리 및 RLS 검증
7. 관리자 비밀번호 하드코딩 제거와 서버 권한 검증
8. production 데모 전환 차단
9. 실제 테스트 계정으로 운영 전 최종 검증

## 8. 서비스 책임 경계

PartyConnect는 카카오 계정 인증과 파티 신청을 처리한다. 생년월일·나이·연령 확인 정보를 수집하거나 연령 확인 기능을 제공하지 않는다. 성인 여부 및 신분증 확인은 파티 현장 운영자가 담당한다.

## 9. 최종 판정

| 영역 | 판정 |
|---|---|
| 프런트엔드 P0 통합 | 완료 |
| GitHub Pages 배포 | 완료 |
| 현재 CI 범위의 E2E | 완료 |
| 실제 카카오 OAuth | 미검증 |
| 실제 Supabase DB/API | 미검증 |
| 관리자 보안 | 차단 |
| 실서비스 회원 모집 | 아직 준비되지 않음 |

**전체 서비스 운영 판정: PARTIAL.** 프런트엔드 배포 완료를 실서비스 인증·데이터 운영 완료로 혼동하지 않는다.
