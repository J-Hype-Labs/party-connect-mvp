# PartyConnect Kakao OAuth 및 실서비스 배포 체크리스트

이 문서는 운영 인증과 DB 연동을 활성화하기 위한 절차다. 체크리스트 작성 또는 코드 병합만으로 운영 설정이 완료되는 것은 아니다.

## 0. 현재 상태 스냅샷

기준일: 2026-11-08

- main SHA: 9949f53567f033e269acc123d47b59cbd22ff254
- P0-AUTH 공통 모듈 및 callback page 코드가 main에 반영됨
- Pages workflow Run 42472345956: 성공, 위 SHA 배포
- CI Run 42472346425: 확인 시 실행 중
- 두 HTML의 PARTYLINK_CONFIG Supabase URL/공개 키는 비어 있음
- auth-client.js는 설정이 없으면 live=false이며 카카오 버튼을 비활성화함
- auth/callback/index.html은 존재하지만 auth-service.loginWithKakao()는 현재 페이지 URL을 redirectTo로 지정함. callback page가 실제 OAuth redirect target인지 미검증
- OnboardingScreen 컴포넌트는 존재하지만 callback 및 두 앱 페이지에서 실제로 연결되었는지 미검증
- 프런트엔드가 호출하는 /me 및 /me/onboarding API는 백엔드 PR #1 handler에 없음
- 백엔드 PR #1은 OPEN, migration/Edge Function은 아직 main에 병합되지 않음
- index.html에 ADMIN_PASSWORD 상수가 남아 있음

증거:
- Frontend main CI: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42472346425
- Pages: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42472345956
- Frontend PR #8: https://github.com/J-Hype-Labs/party-connect-mvp/pull/8
- Backend PR #1: https://github.com/J-Hype-Labs/partylink/pull/1

## 1. 사전 승인 및 환경 분리

- [ ] Supabase project ref와 소유자 확인
- [ ] 개발/스테이징/운영 환경 구분
- [ ] 테스트용 Kakao 계정 준비
- [ ] 테스트 파티와 테스트 회원 준비
- [ ] 운영 DB schema/version 및 백업 확인
- [ ] 백엔드 PR #1 코드 리뷰
- [ ] 관리자 인증 취약점 해결 계획 승인

scripts/reset_dev_only.sql은 개발 DB 전용이다. 운영 DB에서 실행하지 않는다.

## 2. Kakao Developers

https://developers.kakao.com/

1. PartyConnect 애플리케이션 확인
2. Web 플랫폼에 https://j-hype-labs.github.io 등록
3. 필요 시 로컬 테스트 도메인 등록
4. Kakao Login 활성화
5. Supabase Dashboard의 Kakao Provider에서 정확한 callback URI 확인
6. Kakao Redirect URI에 Supabase callback 등록:
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
7. 서비스에 필요한 최소 동의항목 설정
8. 이메일은 선택 정보로 취급하고 미제공 사용자 허용 설정 확인
9. REST API Key와 Client Secret 준비

Kakao Client Secret은 Supabase Provider 설정에만 입력한다. 프런트엔드·GitHub·문서·로그에 기록하지 않는다.

## 3. Supabase Auth

Authentication → Sign In / Providers → Kakao

- [ ] Kakao Provider 활성화
- [ ] REST API Key 입력
- [ ] Client Secret 입력
- [ ] 이메일 미제공 사용자 허용 여부 확인

Authentication → URL Configuration

- Site URL: https://j-hype-labs.github.io/party-connect-mvp/
- [ ] 앱 callback 구현과 실제 redirectTo 값을 먼저 확인
- [ ] callback page를 redirect target으로 채택하면 다음 주소를 allowlist에 등록:
  https://j-hype-labs.github.io/party-connect-mvp/auth/callback/
- [ ] callback page가 실제로 사용되기 전에는 존재하지 않는 주소를 임의로 등록하지 않음
- [ ] 개발 callback은 별도 추가
- [ ] 불필요한 와일드카드 redirect 제거

Kakao provider callback은 Supabase 주소이고, Supabase의 redirectTo는 브라우저 앱 주소다. 둘을 혼동하지 않는다.

## 4. Frontend 공개 설정

현재 두 HTML에 PARTYLINK_CONFIG가 정의되어 있고 값은 비어 있다.

브라우저 허용:
- Supabase Project URL
- Supabase publishable/anon 공개 키

브라우저 금지:
- Supabase service_role/secret key
- Kakao Client Secret
- DB 비밀번호
- 관리자 비밀번호

현재 auth-client.js는 URL/키가 없으면 live=false로 설정하고 로그인 버튼을 비활성화한다. localhost는 ?live=1일 때만 live가 된다. ?demo=1은 production에서도 live를 끌 수 있다.

실제 회원 운영 전:
- [ ] production에서는 demo query override 제거
- [ ] production 설정 누락 시 fail-closed
- [ ] API 오류 시 mock 성공/가짜 신청으로 전환하지 않음
- [ ] 개발/CI mock은 명시적 개발 환경에서만 허용
- [ ] 두 HTML의 설정을 공통 설정 파일로 통합 검토

## 5. Backend PR #1 및 DB

- [ ] PR #1 코드와 migration 검토 후 승인·병합
- [ ] 기본 v2 스키마 선행 조건 확인
- [ ] migration을 스테이징에 우선 적용
- [ ] stores, party_slots, guests, applications, deposit_histories 확인
- [ ] service_role 전용 SQL 함수 권한 확인
- [ ] anon/authenticated 직접 쓰기 차단 확인
- [ ] 회원별 신청 조회/취소가 auth user ID에 묶이는지 확인
- [ ] 다른 회원 데이터 접근 차단
- [ ] 가입 동의 이력의 migration/API가 추가되었는지 확인

현재 PR #1 migration에는 member onboarding endpoint/table이 확인되지 않았다. 프런트엔드의 /me 및 /me/onboarding 호출을 실제 구현과 테스트 없이 운영 기능으로 간주하지 않는다.

## 6. Edge Function

PR #1 병합과 코드 리뷰 후 대상 project ref를 확인하고 실행한다.

- supabase login
- supabase link --project-ref <project-ref>
- supabase functions deploy partylink-api --no-verify-jwt
- supabase secrets set ALLOWED_ORIGINS=https://j-hype-labs.github.io,http://localhost:3000

- [ ] 배포 대상 project ref 확인
- [ ] 함수 배포 성공
- [ ] SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY가 서버 환경에 존재
- [ ] ALLOWED_ORIGINS를 필요한 origin으로 제한
- [ ] OPTIONS preflight 확인
- [ ] 공개 파티 목록 조회
- [ ] 비로그인 신청/내 신청 조회 거부
- [ ] 로그인 회원 본인 신청 조회/취소
- [ ] 타 회원 데이터 접근 거부
- [ ] service_role 키 브라우저 노출 없음

--no-verify-jwt는 공개 목록을 위해 gateway JWT 검사를 끄는 설정이다. 로그인 필수 API는 handler 내부에서 auth.getUser로 토큰을 검증해야 한다.

## 7. Onboarding API 선행 구현

현재 프런트엔드는 GET /me 및 POST /me/onboarding을 호출하지만 백엔드 PR #1의 현재 handler는 이 경로를 제공하지 않는다.

- [ ] GET /me 구현: 검증된 auth user ID 기준 가입 상태 조회
- [ ] POST /me/onboarding 구현: 필수/선택 동의 버전과 시각 저장
- [ ] DB migration 및 권한 정책 구현
- [ ] user_id를 요청 body에서 받지 않고 검증된 token에서 결정
- [ ] 동의 저장 실패 시 가입 완료 처리 금지
- [ ] 기존 회원과 신규 회원 구분 테스트
- [ ] callback 이후 OnboardingScreen 실제 렌더링 연결
- [ ] 가입 완료 후 returnPath/partyId 복원 테스트

## 8. 실제 Kakao OAuth 테스트

- [ ] 신규 테스트 계정 로그인
- [ ] Supabase Auth 사용자 생성
- [ ] OAuth callback 경로 확인
- [ ] callback에서 세션 생성 확인
- [ ] 최초 가입 동의 저장
- [ ] 선택 마케팅 동의 미선택 가입
- [ ] 로그아웃 후 재로그인
- [ ] 새로고침 후 세션 유지
- [ ] 메인/전용 페이지 이동 후 세션 유지
- [ ] 로그인 취소 및 인증 실패 처리
- [ ] 이메일 미제공 계정 처리

## 9. 실제 신청 API 테스트

- [ ] 공개 파티 목록 조회
- [ ] 비로그인 신청 차단 및 로그인 유도
- [ ] 로그인 후 원래 partyId 복귀
- [ ] 이름/연락처 검증
- [ ] 실제 신청 DB 저장
- [ ] 마이페이지 본인 신청 조회
- [ ] 다른 브라우저에서 동일 계정 조회
- [ ] 중복 신청 차단
- [ ] 모집 마감/정원 초과 서버 검증
- [ ] 본인 신청 취소
- [ ] 다른 회원 신청 접근 거부

## 10. 서비스 책임 경계

PartyConnect 회원 인증과 DB에는 생년월일·나이·연령 확인 정보, 연령 판정 API 또는 관련 회원 상태를 추가하지 않는다. 성인 여부와 신분증 확인은 파티 현장 운영자가 담당한다.

## 11. 관리자 보안 게이트

- [ ] index.html의 ADMIN_PASSWORD 상수 제거
- [ ] 클라이언트 비밀번호 비교를 관리자 권한으로 사용하지 않음
- [ ] 서버 측 role 및 권한 검증
- [ ] 일반 회원의 관리자 API 접근 거부
- [ ] RLS 및 Edge Function 권한 테스트
- [ ] 비밀키 유출 검사
- [ ] 실제 사용자 데이터 운영 전 관리자 보안 승인

정적 프런트엔드의 환경변수는 브라우저에 전달되므로 관리자 비밀번호 보관 장소가 될 수 없다.

## 12. 배포와 종료 기준

- [ ] CI 최신 main SHA 통과
- [ ] 실제 Kakao OAuth 테스트 성공
- [ ] 스테이징 DB/API 테스트 성공
- [ ] 운영 설정 승인
- [ ] migration 및 Edge Function 배포 확인
- [ ] GitHub Pages 배포 SHA 확인
- [ ] 운영 브라우저에서 로그인·신청·마이페이지 확인
- [ ] 로그아웃·세션 만료 확인
- [ ] RLS/권한 테스트 증거 첨부
- [ ] 미검증 항목 별도 보고

프런트엔드 배포, OAuth 인증, DB/API, 관리자 보안은 각각 독립적으로 판정한다.
