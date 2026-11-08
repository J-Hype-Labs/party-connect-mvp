# PartyConnect ELI10 현황 보고

- 기준일: 2026-11-08
- 기준 main: 9949f53567f033e269acc123d47b59cbd22ff254

## 1. 한 줄 결론

**파티커넥트 프런트엔드는 배포됐고 공통 카카오 인증 코드도 main에 추가됐다. 하지만 실제 카카오 로그인, 가입 동의 저장, 운영 DB 연결은 아직 완료로 확인되지 않았다.**

## 2. 최근 배포

| 항목 | 결과 |
|---|---|
| PR #8 | 병합 완료 |
| 기존 P0 main SHA | 0942af408d1221ec7225f9add4c996929ccdaef5 |
| 최신 main SHA | 9949f53567f033e269acc123d47b59cbd22ff254 |
| 최신 Pages workflow | Run 42472345956 성공 |
| 최신 Pages 배포 SHA | 9949f53567f033e269acc123d47b59cbd22ff254 |
| 최신 CI | Run 42472346425, 확인 시 실행 중 |
| 이전 SHA E2E | 93/93 PASS |

이전 93개 E2E는 SHA 0942af4 기준이다. Auth 모듈이 추가된 SHA 9949f53의 테스트 결과로 재사용하지 않는다.

링크:
- 최신 main: https://github.com/J-Hype-Labs/party-connect-mvp/commit/9949f53567f033e269acc123d47b59cbd22ff254
- 최신 CI: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42472346425
- Pages: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42472345956
- 메인: https://j-hype-labs.github.io/party-connect-mvp/
- 전용 페이지: https://j-hype-labs.github.io/party-connect-mvp/party-connect/

## 3. 새로 추가된 인증 코드

main에 다음 공통 파일이 추가됐다.

- js/auth-client.js: Supabase client 및 환경 판정
- js/auth-service.js: 카카오 로그인, callback, 세션 복원, 로그아웃
- js/auth-ui.js: 로그인 모달, 가입 동의 UI, 오류/환영 UI
- js/party-api.js: 파티·신청·마이페이지 API
- auth/callback/index.html: OAuth callback 화면

두 페이지의 인증 코드를 공통 모듈로 통합하려는 구조는 마련됐다.

## 4. 아직 해결되지 않은 문제

1. Supabase URL/공개 키가 비어 있어 실제 카카오 OAuth를 실행할 수 없다.
2. loginWithKakao의 redirectTo는 현재 페이지 URL을 사용한다. 새 callback 페이지와 실제 연결 여부가 검증되지 않았다.
3. callback은 신규 가입자를 onboarding query로 메인 페이지에 보내지만, 실제 가입 동의 UI가 페이지에 연결됐는지 확인되지 않았다.
4. 프런트엔드는 /me와 /me/onboarding을 호출하지만 백엔드 PR #1 handler에는 해당 API가 없다.
5. auth-client의 ?demo=1은 production에서도 live 모드를 끌 수 있다.
6. 관리자 비밀번호 상수가 여전히 메인 HTML에 있다.
7. test:auth 스크립트는 있으나 auth-*.spec.js 테스트 파일과 CI 실행 단계가 확인되지 않았다.

## 5. 운영 준비 상태

| 영역 | 판정 |
|---|---|
| 프런트엔드 P0 통합·배포 | 완료 |
| 공통 Auth 코드 추가 | 코드 반영 |
| 실제 Kakao OAuth | 미검증 |
| 신규 회원 가입 동의 | UI 컴포넌트 존재, 실제 연결/저장 미검증 |
| 실제 DB 신청·조회·취소 | 미검증 |
| 회원별 데이터 격리 | 실제 운영 검증 필요 |
| 관리자 보안 | 차단 |
| 실서비스 회원 모집 | 준비되지 않음 |

## 6. 백엔드 상태

백엔드 저장소 J-Hype-Labs/partylink의 PR #1은 2026-11-08 확인 시 OPEN이다. PR에는 웹 연동 migration과 partylink-api Edge Function이 포함되지만 아직 main 병합·운영 배포로 간주하지 않는다.

특히 현재 handler는 parties와 applications 경로를 처리하지만 /me 및 /me/onboarding 경로는 없다.

## 7. 다음 작업 우선순위

1. callback page와 loginWithKakao redirectTo를 하나의 실제 흐름으로 연결
2. 신규 가입 동의 UI를 callback 이후 실제로 표시
3. /me 및 /me/onboarding API와 DB 동의 이력 구현
4. backend PR #1 리뷰·병합·스테이징 적용
5. 실제 Kakao 테스트 계정으로 OAuth 확인
6. 실제 신청·조회·취소와 사용자 간 데이터 격리 검증
7. production의 demo override 제거
8. 관리자 비밀번호 하드코딩 제거 및 서버 권한 검증
9. Auth 전용 E2E를 추가하고 CI에 연결

## 8. 책임 경계

PartyConnect는 카카오 계정 인증과 파티 신청을 처리한다. 생년월일·나이·연령 확인 정보를 수집하거나 관련 인증 기능을 제공하지 않는다. 성인 여부와 신분증 확인은 파티 현장 운영자가 담당한다.

## 9. 최종 판정

**PARTIAL.** 프런트엔드 배포는 완료됐고 인증 기반 코드가 추가됐다. 실제 OAuth, 가입 동의 API, 운영 DB, 관리자 보안은 아직 검증 또는 구현이 필요하다.
