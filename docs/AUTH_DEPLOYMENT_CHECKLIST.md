# PartyConnect 카카오 OAuth 및 실서비스 배포 체크리스트

이 문서는 실제 카카오 인증과 Supabase API를 활성화할 때 운영 담당자가 수행할 작업 순서다. 현재 설정 완료를 의미하지 않는다.

## 0. 현재 상태

2026-11-08 확인 기준:

- 프런트엔드 main: 0942af408d1221ec7225f9add4c996929ccdaef5
- PR #8 병합 및 GitHub Pages 배포 workflow 성공
- 프런트엔드의 PARTYLINK_CONFIG Supabase URL/공개 키는 빈 문자열
- 설정이 비어 있으므로 현재 코드 경로는 데모 모드
- 백엔드 PR #1은 OPEN이며 migration과 Edge Function이 아직 main에 병합되지 않음
- 실제 Kakao OAuth, 실제 Supabase DB 신청/조회는 미검증
- 메인 index.html에 ADMIN_PASSWORD 상수가 남아 있음. 실서비스 데이터/관리자 기능 활성화 전 제거 필수

관련:
- Frontend PR #8: https://github.com/J-Hype-Labs/party-connect-mvp/pull/8
- Backend PR #1: https://github.com/J-Hype-Labs/partylink/pull/1
- Frontend main CI: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42409901830
- GitHub Pages deployment: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42409901461

## 1. 사전 승인과 환경 분리

- [ ] 운영 Supabase 프로젝트 소유자와 project ref 확인
- [ ] 개발/스테이징/운영 환경 구분
- [ ] 테스트용 Kakao 계정 및 담당자 준비
- [ ] 실제 개인정보를 사용하지 않는 테스트 파티 준비
- [ ] 운영 DB 현재 schema/version 및 데이터 백업 확인
- [ ] 백엔드 PR #1 코드 리뷰 및 병합 승인
- [ ] 운영 관리자 인증 취약점 해결 계획 승인

기존 DB 상태를 모른 채 migration을 실행하지 않는다. scripts/reset_dev_only.sql은 개발 DB 전용이며 운영 DB에서 실행 금지.

## 2. Kakao Developers 설정

https://developers.kakao.com/

1. PartyConnect에 사용할 Kakao 애플리케이션을 확인한다.
2. 앱 설정의 Web 플랫폼에 다음 도메인을 등록한다.
   - https://j-hype-labs.github.io
   - 로컬 테스트 시 http://localhost:3000
3. Kakao Login을 활성화한다.
4. Supabase Dashboard의 Kakao Provider 화면에서 표시되는 callback URI를 확인한다.
5. Kakao Login Redirect URI에 정확히 등록한다.
   - https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
6. 필요한 동의항목만 요청한다.
   - 닉네임/프로필 사진은 서비스 표시 필요성에 따라 선택
   - 이메일은 선택 정보로 취급하며 이메일 미제공 계정도 로그인 가능하도록 검토
7. REST API Key와 Client Secret을 확인한다.

Kakao Client Secret은 프런트엔드, GitHub 저장소, PR, 이슈, 문서에 기록하지 않는다.

## 3. Supabase Auth 설정

Supabase Dashboard → Authentication → Sign In / Providers → Kakao

- [ ] Kakao Provider 활성화
- [ ] Kakao REST API Key 설정
- [ ] Kakao Client Secret 설정
- [ ] 이메일이 없는 사용자 허용 여부 확인
- [ ] Site URL 확인: https://j-hype-labs.github.io/party-connect-mvp/
- [ ] Redirect URL allowlist에 정확한 앱 callback 추가:
  https://j-hype-labs.github.io/party-connect-mvp/auth/callback/
- [ ] 필요한 로컬 개발 callback만 추가
- [ ] 불필요한 와일드카드 redirect 제거

Kakao의 provider callback(Supabase 주소)과 Supabase가 로그인 후 앱으로 돌려보내는 redirectTo(앱 주소)는 서로 다른 주소다.

## 4. DB migration 및 RLS

백엔드 PR #1이 승인·병합된 뒤 진행한다.

- [ ] 기존 v2 스키마와 migration 선행 조건 확인
- [ ] 백업/복구 계획 확인
- [ ] migration을 스테이징에 먼저 적용
- [ ] stores, party_slots, guests, applications, deposit_histories 구조 확인
- [ ] service_role 전용 함수 권한 확인
- [ ] anon/authenticated 직접 쓰기 권한 차단 확인
- [ ] 회원별 신청 조회가 auth user ID에 묶이는지 확인
- [ ] 타 회원 신청 ID 조회·취소가 거부되는지 확인
- [ ] 가입 동의 이력 기능이 필요하면 별도 migration/API/테스트 추가
- [ ] 스테이징 테스트 완료 후 운영 적용 승인

동의 이력은 terms, privacy, marketing을 구분한다. 생년월일·나이·연령 확인 데이터나 관련 상태를 추가하지 않는다.

## 5. Edge Function 배포

백엔드 코드와 migration이 main에 반영된 뒤 실행한다.

- supabase login
- supabase link --project-ref <project-ref>
- supabase functions deploy partylink-api --no-verify-jwt
- supabase secrets set ALLOWED_ORIGINS=https://j-hype-labs.github.io,http://localhost:3000

- [ ] 배포 대상 project ref 확인
- [ ] 함수 배포 성공
- [ ] SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY가 서버 환경에 존재하는지 확인
- [ ] ALLOWED_ORIGINS가 필요한 origin만 포함하는지 확인
- [ ] OPTIONS preflight 확인
- [ ] 공개 파티 목록 GET 확인
- [ ] 비로그인 신청/내 신청 조회가 401로 거부되는지 확인
- [ ] 유효한 로그인 토큰으로 본인 신청 조회
- [ ] 다른 사용자 데이터 접근 차단
- [ ] service_role 키가 브라우저 응답이나 GitHub에 노출되지 않는지 검사

--no-verify-jwt는 공개 목록을 위해 게이트웨이 검사를 끄는 설정이다. 로그인 필수 API는 Edge Function 내부에서 auth.getUser로 토큰을 직접 검증해야 한다.

## 6. 프런트엔드 설정

현재 두 HTML에 PARTYLINK_CONFIG가 각각 정의되어 있고 값은 비어 있다. 구현 단계에서 공통 설정 모듈로 통합하는 것을 우선 검토한다.

허용되는 브라우저 설정:

- Supabase Project URL
- Supabase publishable/anon 공개 키

금지:

- service_role/secret key
- Kakao Client Secret
- 관리자 비밀번호
- DB 비밀번호

현재 코드는 localhost에서 ?live=1일 때 실서비스 모드로 전환하고, ?demo=1로 어느 환경에서든 데모를 강제할 수 있다. 실서비스 출시 전에는 production에서 URL 파라미터로 데모 인증을 활성화할 수 없도록 수정하고, 설정 누락 시 fail-closed 처리한다.

운영 URL에 설정값이 없거나 연결이 실패하면 가짜 로그인/가짜 신청 성공으로 전환하지 않는다.

## 7. 실제 카카오 계정 통합 테스트

별도 테스트 계정으로 실행하고 결과를 기록한다.

- [ ] 신규 카카오 계정 로그인
- [ ] Supabase Auth 사용자 생성 확인
- [ ] 앱 callback 복귀
- [ ] 신규 회원 필수 동의 저장
- [ ] 선택 마케팅 동의 미선택 가입
- [ ] 로그아웃 후 재로그인
- [ ] 새로고침 후 세션 유지
- [ ] 메인과 전용 페이지 이동 후 세션 유지
- [ ] 로그인 취소 및 provider 오류 처리
- [ ] 이메일 미제공 계정 처리

## 8. 실제 신청 통합 테스트

- [ ] 공개 파티 목록 조회
- [ ] 비로그인 신청 차단 및 로그인 유도
- [ ] 로그인 후 원래 선택 파티 복귀
- [ ] 이름/연락처 입력 검증
- [ ] 실제 신청 DB 저장
- [ ] 마이페이지 본인 신청 조회
- [ ] 다른 브라우저에서 같은 회원 신청 조회
- [ ] 중복 신청 차단
- [ ] 모집 마감/정원 초과 차단
- [ ] 본인 신청 취소
- [ ] 취소 후 내역 갱신
- [ ] 다른 회원 신청 접근 거부

## 9. 관리자·운영 보안 게이트

실제 사용자 데이터를 받기 전에 반드시 확인한다.

- [ ] 프런트엔드 ADMIN_PASSWORD 하드코딩 제거
- [ ] 관리자 권한을 서버 측 role로 검증
- [ ] 일반 회원이 관리자 API를 호출할 수 없음
- [ ] 관리자 데이터 조회/수정은 최소 권한
- [ ] RLS와 Edge Function 권한 테스트
- [ ] CORS allowlist 확인
- [ ] API rate limit/남용 방지 검토
- [ ] 비밀키 유출 검사
- [ ] 개인정보 처리방침과 보유·삭제 정책 확인

정적 프런트엔드의 환경변수는 브라우저에 전달되므로 관리자 비밀번호 보관 장소로 사용할 수 없다.

## 10. 배포와 종료 기준

- [ ] 코드 PR 및 CI 성공
- [ ] 스테이징 OAuth/DB 통합 테스트 성공
- [ ] 운영 설정 승인
- [ ] 운영 migration 승인 및 적용
- [ ] Edge Function 배포 확인
- [ ] 프런트엔드 설정 배포
- [ ] GitHub Pages 배포 SHA 확인
- [ ] 운영 URL 브라우저에서 로그인/신청/마이페이지 확인
- [ ] 로그아웃/세션 만료 확인
- [ ] 보안 및 RLS 테스트 증거 첨부
- [ ] 실제 OAuth와 DB를 검증하지 않은 항목은 미완료로 보고

완료 판정은 **프런트엔드 배포**, **OAuth 인증**, **DB/API**, **보안 게이트**를 각각 구분한다.
