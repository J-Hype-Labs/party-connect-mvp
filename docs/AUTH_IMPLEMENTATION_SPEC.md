# PartyConnect 카카오 OAuth 실서비스 인증 구현 명세

- 버전: 1.1
- 기준일: 2026-11-08
- 기준 main: 9949f53567f033e269acc123d47b59cbd22ff254
- 프런트엔드: J-Hype-Labs/party-connect-mvp
- 백엔드: J-Hype-Labs/partylink
- 화면 명세: AUTH_UI_UX_SPEC.md
- 운영 절차: AUTH_DEPLOYMENT_CHECKLIST.md

## 1. 목표

카카오 계정으로 사용자를 인증하고 Supabase Auth 세션으로 회원을 식별한다. 로그인한 회원은 자신의 파티 신청을 생성·조회·취소할 수 있어야 한다.

최종 사용자 흐름:

1. 파티 목록 탐색
2. 파티 상세 확인
3. 파티 신청하기
4. 비로그인 상태면 카카오 로그인
5. Supabase Auth 세션 확인
6. 신규 회원이면 서비스 필수 동의
7. 원래 보던 파티와 신청 의도 복원
8. 신청자 정보 입력
9. 서버에서 신청 검증 및 저장
10. 마이페이지에서 본인 신청 확인

로그인 버튼을 누르는 것만으로 인증 완료로 보지 않는다. 실제 Kakao 계정, Supabase Auth, DB/API까지 검증되어야 실서비스 인증 완료다.

## 2. 책임과 범위

### 포함

- Kakao OAuth 로그인/로그아웃
- Supabase Auth 사용자 식별 및 세션
- 서비스 약관과 개인정보 처리 동의
- 회원별 파티 신청·조회·취소
- 본인 데이터 접근 통제
- 로그인·가입·신청 UI/UX와 오류 처리
- 관리자 역할의 서버 측 권한 검증

### 명시적 제외

- PartyConnect는 회원 인증을 위해 생년월일, 나이 또는 연령 확인 자료를 수집하지 않는다.
- 연령 판정, 성인인증 API, 관련 DB 필드·상태·화면을 구현하지 않는다.
- 성인 여부와 신분증 확인은 파티 현장 운영자의 책임이다. PartyConnect의 계정 인증과 별도 업무다.
- 카카오 로그인 성공을 실명 확인이나 전화번호 소유 확인으로 간주하지 않는다.

## 3. 현재 코드 상태

main SHA 9949f53에서 확인한 상태:

| 항목 | 코드 상태 | 실제 서비스 상태 |
|---|---|---|
| 공통 Supabase client | js/auth-client.js 존재 | 설정값 공란 |
| 공통 Auth service | js/auth-service.js 존재 | 실제 OAuth 미검증 |
| 공통 Auth UI | js/auth-ui.js 존재 | 컴포넌트 연결 일부 미검증 |
| Party API adapter | js/party-api.js 존재 | 실제 API 미검증 |
| OAuth callback page | auth/callback/index.html 존재 | redirectTo 연결 미검증 |
| 세션 복원 | restoreSession 존재 | 실제 계정·다중 페이지 검증 필요 |
| 로그아웃 | signOut await 처리 | 실제 Supabase 검증 필요 |
| 신규 회원 동의 UI | OnboardingScreen 컴포넌트 존재 | callback/페이지 연결 미검증 |
| GET /me | 프런트엔드 호출 존재 | 백엔드 handler에 없음 |
| POST /me/onboarding | 프런트엔드 호출 존재 | 백엔드 handler에 없음 |
| Supabase 설정 | PARTYLINK_CONFIG 공란 | live=false |
| 관리자 인증 | 브라우저 비밀번호 상수 존재 | 운영 권한으로 사용 금지 |

## 4. 기술 구조

현재 공통 모듈:

- js/auth-client.js: Supabase client, 환경 판정, Edge Function API helper
- js/auth-service.js: 인증 상태, 카카오 로그인, callback, 세션 복원, 로그아웃, return URL
- js/auth-ui.js: LoginModal, OnboardingScreen, AuthProcessingScreen, ProfileMenu 등
- js/party-api.js: 파티 목록, 신청, 내 신청, 취소, 프로필, 온보딩 API adapter
- auth/callback/index.html: OAuth callback 화면
- index.html 및 party-connect/index.html: 공통 모듈을 로드하는 앱 페이지

페이지별 인증 로직을 다시 복제하지 않는다. 기존 React UMD/Babel 구조를 유지하고 별도 승인 없이 Vite/React 전환을 병행하지 않는다.

## 5. Kakao OAuth 설정

### Kakao Developers

Kakao Developers: https://developers.kakao.com/

- PartyConnect Kakao 애플리케이션 확인
- Web 플랫폼에 운영 도메인 등록
- Kakao Login 활성화
- REST API Key 및 Client Secret 확인
- 필요한 최소 동의항목만 설정
- 이메일은 제공되지 않을 수 있으므로 필수 회원 식별자로 사용하지 않음

Kakao Login의 Redirect URI는 Supabase Auth callback이다.

https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback

Kakao Client Secret은 Supabase Provider 설정에만 입력한다. 브라우저, GitHub, 문서, 로그에 기록하지 않는다.

### Supabase Auth

Authentication → Sign In / Providers → Kakao

- Provider 활성화
- Kakao REST API Key 입력
- Kakao Client Secret 입력
- 이메일 미제공 계정 허용 여부 확인

Site URL:

https://j-hype-labs.github.io/party-connect-mvp/

앱 callback 목표 URL:

https://j-hype-labs.github.io/party-connect-mvp/auth/callback/

Kakao의 Supabase callback과 Supabase의 앱 redirectTo는 서로 다른 주소다.

## 6. 현재 OAuth callback의 불일치

현재 js/auth-service.js의 loginWithKakao()는 redirectTo에 현재 페이지의 origin + pathname + query를 지정한다.

반면 auth/callback/index.html은 별도 callback 페이지로 구현되어 있다.

따라서 현재 코드만으로는 callback 페이지가 실제 OAuth redirect target으로 사용된다고 단정할 수 없다.

### 목표 구현

1. loginWithKakao()가 중앙 callback URL로 redirectTo를 지정한다.
2. Supabase Auth의 Redirect URL allowlist에 동일한 callback URL을 등록한다.
3. Kakao provider callback은 Supabase Auth 주소로 유지한다.
4. callback page는 detectSessionInUrl을 통한 자동 code 처리를 한 번만 수행한다.
5. 자동 처리와 수동 exchangeCodeForSession을 중복 실행하지 않는다.
6. 세션 생성 확인 후 회원 상태를 조회한다.
7. 내부 returnPath/partyId를 복원한다.
8. 성공 후 URL의 인증 query를 제거한다.

callback page가 실제로 사용되기 전에는 redirect 설정 완료로 표시하지 않는다.

## 7. 인증 상태 및 세션

공통 상태:

- INITIALIZING
- SIGNED_OUT
- AUTH_REDIRECTING
- AUTH_CALLBACK
- ONBOARDING_REQUIRED
- SIGNED_IN
- SESSION_EXPIRED
- AUTH_ERROR
- SIGNING_OUT

원칙:

- 초기 세션 확인 전 비로그인 UI를 확정하지 않는다.
- Supabase auth.users.id를 회원 고유 식별자로 사용한다.
- provider는 kakao만 허용한다.
- PKCE, persistSession, autoRefreshToken, detectSessionInUrl을 사용한다.
- access token을 별도 localStorage 키에 중복 보관하지 않는다.
- token, authorization code, refresh token을 URL·콘솔·분석 로그에 남기지 않는다.
- 로그아웃은 signOut 성공 후 사용자 상태와 회원 데이터 UI를 초기화한다.
- 로그아웃 실패 시 로그인 상태를 유지하고 오류를 표시한다.

현재 restoreSession과 toAppUser는 user_metadata.onboarding_complete 값을 사용한다. 그러나 /me API가 없고, 해당 metadata가 서버 측 동의 저장 결과와 동기화되는 흐름도 확인되지 않았다. 서버 가입 상태 조회를 단일 기준으로 연결해야 한다. localStorage만으로 가입 완료를 판단하지 않는다.

현재 logout()의 실패 분기는 SIGNING_OUT 상태를 다시 알릴 가능성이 있다. 실패 시 이전 SIGNED_IN 상태와 사용자를 명시적으로 복원하는 테스트를 추가한다.

## 8. 최초 회원 가입과 동의 기록

카카오 인증과 PartyConnect 서비스 가입 완료를 구분한다.

### 신규 회원

1. Supabase Auth 세션 확인
2. 서버에서 가입/동의 상태 조회
3. 미완료 회원에게 OnboardingScreen 표시
4. 필수 이용약관 및 개인정보 처리 동의
5. 선택 마케팅 동의는 기본 미선택
6. 서버 저장 성공
7. 가입 완료 상태 확정
8. 원래 파티 신청 흐름 복원

### 기존 회원

서버 가입 상태가 유효하면 가입 화면을 생략한다. 약관 버전이 변경되어 재동의가 필요한 경우에만 해당 동의를 요청한다.

### 동의 데이터 제안

현재 백엔드 PR #1의 migration에 별도 회원 동의 이력 테이블은 확인되지 않았다. 구현 시 기존 스키마를 재검토하고 필요한 경우 migration을 추가한다.

권장 필드:
- user_id: auth.users.id 참조
- consent_type: terms, privacy, marketing
- document_version
- accepted
- recorded_at
- created_at

필수 동의와 선택 마케팅 동의를 분리한다. 동의 이력은 서버에 저장하며 user_id는 검증된 JWT에서 가져온다.

### 현재 연결 문제

- js/auth-ui.js에 OnboardingScreen은 export되어 있다.
- auth/callback/index.html은 신규 회원이면 /?onboarding=1로 이동한다.
- 두 앱 페이지에서 onboarding query를 받아 OnboardingScreen을 표시하는 연결은 확인되지 않았다.
- auth-service.js와 js/party-api.js는 me/onboarding을 호출하지만 백엔드 handler에 해당 route가 없다.

따라서 온보딩은 컴포넌트 존재만으로 완료가 아니다. 또한 callback page가 consumeReturnUrl()로 복귀 정보를 먼저 제거한 뒤 신규 회원을 onboarding query로 이동시키므로, 가입 완료 후 원래 partyId가 복구되는지 확인하고 복귀 정보를 보존하도록 수정해야 한다.

## 9. 로그인 후 원래 파티 복귀

로그인 전에 선택한 파티와 신청 의도를 유지한다.

저장 데이터:
- returnPath
- partyId
- intent
- createdAt

보안:
- 내부 허용 경로만 허용
- 외부 URL 및 // 시작 URL 차단
- 짧은 TTL 적용
- 개인정보와 토큰은 저장하지 않음
- callback/가입 완료 후 한 번만 소비하고 제거
- 인증 취소 시 원래 화면 유지

중요: 현재 callback page는 시작 직후 consumeReturnUrl()로 복귀 정보를 소비한다. 신규 가입 분기에서 main의 onboarding query로 이동할 때 returnInfo가 보존되는지 확인하고, 가입 완료 후 동일 partyId로 복귀하도록 수정해야 한다.

## 10. PartyLink API 계약

백엔드 PR #1의 handler.ts에 현재 확인된 경로:

| 메서드 | 경로 | 인증 | 목적 |
|---|---|---|---|
| GET | /parties | 불필요 | 공개 모집 파티 목록 |
| GET | /applications | 필요 | 본인 신청 내역 |
| POST | /applications | 필요 | 파티 신청 |
| POST | /applications/:id/cancel | 필요 | 본인 신청 취소 |

신청 body:
- slotId
- name
- phone
- agree

Edge Function은 Authorization Bearer token을 auth.getUser로 검증한다. guest_id/user_id를 클라이언트 body에서 받지 않는다. 검증된 auth user ID로 guests 프로필과 신청을 연결한다.

### 프런트엔드가 호출하지만 백엔드에 없는 API

| 메서드 | 경로 | 현재 상태 | 필요한 작업 |
|---|---|---|---|
| GET | /me | 프런트엔드 호출 있음 | handler 및 응답 구현 |
| POST | /me/onboarding | 프런트엔드 호출 있음 | handler, DB 동의 이력, 검증 구현 |

위 두 API는 현재 운영 기능이 아니다. migration, handler, 테스트, 권한 검증이 모두 필요하다.

## 11. 신청 데이터와 권한

- 공개 파티 목록은 비로그인 조회 허용
- 신청·취소·내 신청 조회는 인증 필수
- 사용자 ID는 검증된 Supabase Auth user ID
- 이름·연락처는 신청 목적에 필요한 시점에 수집
- 전화번호 형식은 서버에서도 검증
- 중복 신청은 DB에서 방지
- 모집 마감·정원 초과·신청 제한은 서버에서 재검증
- 신청 성공 UI는 서버 성공 응답 이후에만 표시
- API 오류와 빈 결과를 구분
- 운영 API 실패 시 데모 fixture로 성공처럼 표시하지 않음
- 회원은 본인 신청만 조회·취소 가능

## 12. 보안 요구사항

1. 브라우저에는 Supabase 공개용 publishable/anon key만 둔다.
2. service_role/secret key와 Kakao Client Secret은 Edge Function secret에만 둔다.
3. Edge Function은 토큰을 서버에서 검증한다.
4. 클라이언트가 전달한 user_id/guest_id를 권한 근거로 사용하지 않는다.
5. RLS와 service_role 함수 권한을 함께 검토한다.
6. CORS는 필요한 origin만 허용한다.
7. 관리자 권한은 서버 측 role로 검증한다.
8. index.html의 ADMIN_PASSWORD 상수는 남아 있다. 실서비스 데이터 운영 전에 제거하고 서버 권한으로 대체한다.
9. 정적 프런트엔드 환경변수로 관리자 비밀번호를 숨길 수 있다고 가정하지 않는다.
10. production의 ?demo=1 override를 제거하고 설정 누락 시 fail-closed 처리한다.

## 13. 현재 환경 모드

현재 js/auth-client.js 동작:

- Supabase URL/공개 키가 비어 있으면 live=false
- localhost는 ?live=1이 있어야 live=true
- ?demo=1은 어느 환경에서든 live=false로 만든다
- 현재 두 HTML의 설정값은 비어 있다.
- live=false일 때 LoginModal의 카카오 버튼은 비활성화되고 loginWithKakao()는 실서비스 모드 오류를 반환한다.

이는 현재 코드의 사실이다. 최종 운영 정책은 production에서 demo override를 허용하지 않고, 개발/CI mock은 별도 개발 환경에서만 허용하는 것이다.

## 14. 테스트 요구사항

### 단위/브라우저 테스트

- auth-client 환경 판정
- loginWithKakao 성공/실패
- callback 성공/취소/오류
- PKCE 세션 생성
- 신규/기존 회원 분기
- OnboardingScreen 실제 렌더링
- 필수/선택 동의 검증
- /me 및 /me/onboarding API 성공/실패
- returnPath 검증과 만료
- 가입 후 원래 partyId 복귀
- 세션 복원/갱신
- 로그아웃 성공/실패
- 비로그인 신청 유도
- 중복 신청 차단
- 본인 신청 조회/취소
- 타 회원 데이터 접근 차단
- production demo query 차단
- 설정 누락 시 fail-closed

현재 package.json에는 test:auth 스크립트가 있으나 tests/auth-*.spec.js 파일이 확인되지 않고 CI workflow에도 실행 단계가 없다. tests/app.spec.js는 root element 표시를 확인하는 기본 smoke test이며 OAuth 검증 테스트가 아니다. 인증 테스트가 추가되고 CI에서 실행되기 전까지 자동 검증 완료로 표시하지 않는다.

### 실제 통합 테스트

별도 테스트용 Kakao 계정과 Supabase 프로젝트에서:
1. 신규 로그인
2. Supabase Auth 사용자 확인
3. 최초 동의 저장
4. 로그아웃 및 재로그인
5. 페이지 이동/새로고침 후 세션 유지
6. 실제 신청 저장
7. 본인 신청 조회
8. 다른 브라우저에서 같은 계정 조회
9. 다른 회원 데이터 접근 거부
10. 신청 취소

Mock 테스트 통과는 실제 OAuth/DB 테스트를 대체하지 않는다.

## 15. 완료 조건

- [ ] 실제 Kakao OAuth 성공
- [ ] callback route가 실제 redirect target으로 연결됨
- [ ] 신규/기존 회원 구분이 서버 데이터 기준으로 동작
- [ ] OnboardingScreen이 실제 callback 후 표시됨
- [ ] /me 및 /me/onboarding 서버 구현
- [ ] 동의 이력 DB 저장
- [ ] 가입 후 원래 파티 복귀
- [ ] 세션 복원·갱신·로그아웃 성공
- [ ] 실제 DB 신청·조회·취소
- [ ] 사용자 간 데이터 격리
- [ ] production demo override 제거
- [ ] 관리자 비밀번호 하드코딩 제거 및 서버 권한 검증
- [ ] Auth E2E가 CI에서 실행
- [ ] 모바일 Safari/Chrome 검증
- [ ] 실제 운영 URL에서 로그인·신청·마이페이지 검증

실제 OAuth 또는 DB를 검증하지 않았다면 COMPLETE로 보고하지 않는다.

참고:
- Supabase Kakao provider: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Kakao Developers: https://developers.kakao.com/docs/latest/ko/kakaologin/common
- Backend PR #1: https://github.com/J-Hype-Labs/partylink/pull/1
