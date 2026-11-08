# PartyConnect 카카오 OAuth 실서비스 인증 구현 명세

- 문서 버전: 1.0
- 작성일: 2026-11-08
- 프런트엔드: J-Hype-Labs/party-connect-mvp
- 백엔드: J-Hype-Labs/partylink
- 관련 구현: 프런트엔드 PR #8 병합, 백엔드 PR #1 미병합 상태

## 1. 목표와 완료 정의

카카오 계정으로 사용자를 인증하고 Supabase Auth 세션으로 회원을 식별한다. 인증된 회원은 자신의 파티 신청을 생성·조회·취소할 수 있어야 한다. 로그인 전 파티 탐색은 허용하며, 신청 등 회원 기능을 이용할 때 인증을 요구한다.

완료는 카카오 로그인 버튼이 동작하는 것만을 뜻하지 않는다. 다음 흐름 전체가 실제 서비스 환경에서 검증되어야 한다.

1. 카카오 계정 인증
2. Supabase Auth 사용자 및 세션 생성
3. PartyConnect 회원 가입 상태 확인
4. 필요한 이용약관 동의 기록
5. 원래 보던 페이지와 파티로 복귀
6. 회원 본인 명의의 신청 저장
7. 다른 세션에서 본인 신청 조회
8. 로그아웃 및 세션 만료 처리

현재 프런트엔드의 Supabase 설정값은 비어 있다. 따라서 코드에 OAuth 호출이 존재하더라도 현재 운영 환경에서 실제 카카오 인증이 검증된 상태는 아니다. 백엔드 PR #1도 아직 병합되지 않았다.

## 2. 책임과 범위

### 포함

- 카카오 OAuth 로그인 및 로그아웃
- Supabase Auth 사용자 식별과 세션 수명 관리
- 최초 서비스 이용 동의 기록
- 회원별 신청·취소·조회
- 본인 데이터 접근 통제
- 인증·신청 UI와 오류 처리
- 관리자 권한의 서버 측 검증 기준

### 명시적 제외

- PartyConnect는 회원 인증을 위해 생년월일, 나이 또는 연령 확인 자료를 수집하지 않는다.
- 연령 판정, 성인인증 API, 관련 DB 필드·상태·화면을 구현하지 않는다.
- 성인 여부와 신분증 확인은 파티 현장 운영자의 책임이다. PartyConnect 회원 인증과 별도 업무로 취급한다.
- 카카오 로그인을 실명·전화번호 소유·연령을 확인한 것으로 간주하지 않는다.

### 인증과 별개인 운영 기능

업체 선정, 현장 방문 확인, 미션 검토, 정산은 PartyLink 운영 업무다. 카카오 OAuth 성공만으로 이 업무 권한을 부여하지 않는다.

## 3. 현재 상태와 목표 상태

| 영역 | 현재 코드/저장소 상태 | 목표 |
|---|---|---|
| 카카오 로그인 버튼 | 양 페이지에 존재 | 실제 OAuth 진입 |
| Supabase Auth PKCE | 프런트엔드 코드 존재 | 실제 프로젝트 설정과 계정으로 검증 |
| 세션 복원 | getSession/onAuthStateChange 코드 존재 | 초기화 경합 없이 단일 상태 관리 |
| 로그아웃 | 메인 페이지에서 비동기 완료 전 UI 초기화 가능 | 서버 signOut 성공 후 상태 변경 |
| 데모/실서비스 | 설정 공란이면 데모, URL 파라미터 분기 존재 | 운영에서는 실서비스만 허용 |
| 회원 온보딩/약관 기록 | 별도 영속 기록 확인되지 않음 | 서버 저장 및 버전 관리 |
| 신청 API | 프런트엔드 호출 코드 존재 | 백엔드 PR #1 병합·배포 후 실제 통합 |
| 회원별 신청 | 백엔드 설계는 auth user ID 기준 | 다른 회원 데이터 접근 차단 |
| 관리자 권한 | 메인 HTML에 하드코딩 비밀번호 존재 | 서버 측 역할 검증으로 대체 |

## 4. 권장 아키텍처

브라우저는 Supabase의 공개용 publishable/anon 키만 사용한다. service_role 키, Kakao Client Secret, 관리자 비밀번호는 브라우저에 전달하지 않는다.

인증 흐름:

1. 브라우저에서 Supabase Auth의 Kakao provider로 OAuth를 시작한다.
2. Kakao가 Supabase Auth의 callback으로 인가 결과를 반환한다.
3. Supabase Auth가 OAuth 코드를 처리하고 PKCE 세션을 만든다.
4. 앱 callback 경로로 복귀한다.
5. 공통 Auth 모듈이 세션을 확인하고 회원 상태를 조회한다.
6. 저장된 안전한 내부 복귀 경로로 이동한다.

Kakao Developers에 등록하는 provider callback은 Supabase가 제공하는 다음 형식이다.

- https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback

Supabase Auth의 앱 복귀 허용 URL에는 다음 운영 경로를 정확히 등록한다.

- https://j-hype-labs.github.io/party-connect-mvp/auth/callback/

현재 코드의 OAuth redirectTo는 현재 페이지 URL을 사용한다. 구현 단계에서는 공통 callback 경로로 통일하거나, 현재 페이지 복귀 방식을 유지할 경우 동일한 콜백 처리·복귀 상태 규칙을 보장한다. 두 방식을 동시에 적용해 인가 코드를 중복 처리하지 않는다.

## 5. 공통 Auth 모듈

메인과 전용 페이지가 서로 다른 인증 구현을 갖지 않도록 한다.

권장 책임 분리:

- app-config: 환경별 Supabase URL 및 공개 키
- auth-client: Supabase client 단일 생성
- auth-service: 로그인, 로그아웃, 세션 조회, 상태 구독
- member-service: 가입 상태와 동의 기록 조회·저장
- party-api: 파티·신청·취소·마이페이지 API
- auth-ui: 로그인 모달, 온보딩, 오류 및 로딩 화면

기존 React UMD/Babel 구조를 유지하며 인증 작업과 무관한 Vite/React 전환은 별도 승인 없이는 하지 않는다.

## 6. OAuth 및 세션 규칙

- provider는 kakao만 허용한다.
- OAuth flow는 PKCE를 사용한다.
- 세션 저장과 자동 갱신은 Supabase Auth에 맡긴다.
- 초기 getSession과 onAuthStateChange가 경쟁해 잘못된 로그아웃 화면을 표시하지 않도록 초기화 상태를 둔다.
- 인증 상태가 확정되기 전 회원 전용 화면이나 비로그인 화면을 먼저 표시하지 않는다.
- 로그아웃은 signOut 응답 성공 후 로컬 회원 상태와 회원 전용 데이터를 초기화한다.
- signOut 실패 시 실제 세션이 남아 있을 수 있으므로 로그인 상태를 유지하고 오류를 표시한다.
- 인증 토큰을 직접 localStorage 키에 복제하지 않는다.
- access token, authorization code, refresh token을 URL·콘솔·분석 로그에 남기지 않는다.
- 이메일은 선택적 프로필 데이터다. 카카오 이메일 미제공 사용자를 인증 실패로 처리하지 않는다.

## 7. 회원 온보딩과 동의

카카오 인증 성공과 PartyConnect 가입 완료를 구분한다.

### 최초 이용자

1. Supabase Auth 사용자 확인
2. 서버에서 PartyConnect 가입/동의 상태 조회
3. 미가입이면 필수 이용약관과 개인정보 처리방침 동의 화면 표시
4. 선택 마케팅 동의는 기본 미선택
5. 필수 동의 완료 후 서버에 버전과 시각 저장
6. 저장 성공 후 원래 작업으로 복귀

### 기존 회원

서버의 가입 상태가 유효하면 온보딩을 반복하지 않는다. 약관 버전이 바뀌어 재동의가 필요한 경우에만 해당 항목을 다시 요청한다.

### 동의 데이터

현재 백엔드 PR #1 마이그레이션에서 회원 동의 이력 테이블은 확인되지 않았다. 구현 전 기존 스키마를 다시 확인하고, 없다면 별도 migration으로 추가한다.

권장 데이터:

- user_id: auth.users.id 참조
- consent_type: terms, privacy, marketing 중 하나
- document_version
- accepted
- recorded_at
- created_at

필수 동의와 선택 마케팅 동의를 분리한다. 동의 이력은 서버에서 검증하고 기록한다. 브라우저 localStorage만으로 가입 완료를 판정하지 않는다.

사용자 ID는 요청 body에서 받지 않고 검증된 JWT의 auth user ID를 사용한다.

## 8. 로그인 후 원래 작업 복귀

로그인 전 신청하려던 파티와 화면을 잃지 않는다.

복귀 상태는 다음 최소 정보만 저장한다.

- 내부 returnPath
- partyId
- intent: apply 또는 view
- createdAt

저장 위치는 짧은 수명의 sessionStorage 또는 이에 준하는 임시 저장소로 한다. 전화번호·이름 등 개인정보와 토큰은 저장하지 않는다.

보안 규칙:

- 허용된 내부 경로만 복귀 대상으로 인정
- 외부 URL 및 protocol-relative URL 차단
- 만료된 상태는 폐기
- 로그인 취소 시 기존 탐색 화면으로 복귀
- 가입/인증 완료 후 상태를 한 번만 소비하고 삭제
- 잘못된 partyId면 전용 페이지의 안전한 기본 화면으로 이동

목표 흐름: 파티 상세 → 신청하기 → 카카오 로그인 → 최초 동의(해당 시) → 같은 파티 신청서.

## 9. PartyLink API 계약

백엔드 PR #1의 handler.ts와 migration을 기준으로 실제 구현·응답을 재확인한다.

현재 제안된 엔드포인트:

| 메서드 | 경로 | 인증 | 목적 |
|---|---|---|---|
| GET | /parties | 불필요 | 공개 모집 파티 목록 |
| GET | /applications | 필요 | 현재 회원의 신청 내역 |
| POST | /applications | 필요 | 파티 신청 |
| POST | /applications/:id/cancel | 필요 | 본인 신청 취소 |

신청 요청은 slotId, name, phone, agree를 사용한다. 서버는 Authorization Bearer token을 auth.getUser로 검증하고, 검증된 user.id로 guests 프로필을 연결한다. user_id 또는 guest_id를 클라이언트가 임의 지정하는 구조는 금지한다.

온보딩 동의 기능이 구현되지 않았다면 다음 API를 추가하는 방안을 검토한다.

| 메서드 | 경로 | 인증 | 목적 |
|---|---|---|---|
| GET | /me | 필요 | 회원 및 가입 상태 조회 |
| POST | /me/consents | 필요 | 필수/선택 동의 이력 저장 |

위 두 API는 현재 구현 완료된 것으로 간주하지 않는다. DB migration, handler, 테스트, RLS 또는 service-role 경계를 함께 구현해야 한다.

## 10. 신청 데이터 규칙

- 파티 목록은 공개 조회 가능
- 신청·취소·내 신청 조회는 인증 필수
- 사용자 식별은 검증된 Supabase Auth user ID
- 신청자 이름과 연락처는 신청 처리에 필요한 시점에 수집
- 전화번호는 서버에서도 형식 검증
- 동일 회원의 동일 파티 중복 신청은 DB 수준에서 방지
- 모집 마감·정원 초과·차단 상태는 서버에서 재검증
- 신청 성공 UI는 서버 성공 응답 이후에만 표시
- 신청 취소도 서버 성공 후 목록을 갱신
- API 오류와 빈 목록을 구분
- 데모 fixture를 실서비스 API 오류의 대체 데이터로 표시하지 않는다.

## 11. 보안 요구사항

1. Supabase service_role/secret 키와 Kakao Client Secret은 Edge Function 또는 관리형 secret에만 저장한다.
2. 브라우저에는 공개용 Supabase 키만 둔다.
3. Edge Function은 토큰을 서버에서 검증한다.
4. service_role로 DB 함수를 호출하더라도 요청 회원 ID는 검증된 토큰에서만 가져온다.
5. 회원은 본인 신청만 조회·취소할 수 있어야 한다.
6. RLS와 서버 함수 권한을 함께 검토한다.
7. CORS는 실제 운영 origin과 필요한 개발 origin만 허용한다.
8. 관리자 권한은 DB 또는 서버 측 역할로 검증한다.
9. 메인 index.html의 ADMIN_PASSWORD 하드코딩은 실서비스 활성화 전에 제거한다. 정적 프런트엔드 환경변수로 옮기는 것은 해결책이 아니다.
10. 운영 설정 누락이나 API 오류를 데모 로그인/가짜 신청 성공으로 대체하지 않는다.

## 12. 데모와 운영 환경

현재 코드 관찰 결과:

- 두 HTML의 PARTYLINK_CONFIG.supabaseUrl 및 supabaseAnonKey는 빈 문자열이다.
- 설정값이 없으면 configured=false이며 데모 모드다.
- localhost는 ?live=1일 때만 실서비스 모드가 된다.
- ?demo=1은 배포 환경에서도 데모 모드를 강제할 수 있다.

이는 현재 구현의 사실이지, 최종 운영 정책이 아니다.

실서비스 출시 전 목표:

- production은 Supabase 설정이 없으면 fail-closed 상태로 로그인·신청을 비활성화한다.
- production에서 URL 파라미터만으로 demo mode를 강제할 수 없게 한다.
- demo mode는 개발/테스트 환경에서만 허용한다.
- staging은 별도 Supabase 프로젝트와 테스트 계정을 사용한다.
- 실서비스 API 실패 시 실제 오류와 재시도 UI를 표시한다.

## 13. 오류 코드와 화면 동작

| 상황 | 처리 |
|---|---|
| 사용자가 OAuth 취소 | 원래 화면 복귀, 취소 안내 |
| provider 설정 오류 | 로그인 재시도 안내, 기술 세부정보는 로그에만 |
| callback code 오류 | 세션 생성 금지, 재시도 |
| 세션 없음/만료 | 회원 기능 차단, 재로그인 안내 |
| 필수 동의 누락 | 온보딩 유지 |
| 동의 저장 실패 | 가입 완료로 처리하지 않고 재시도 |
| API 401 | 세션 확인 후 재로그인 |
| API 403 | 권한 거부, 데이터 미노출 |
| API 409 | 중복 신청 등 업무 충돌 안내 |
| API 410 | 모집 마감 등 상태 변경 안내 |
| 네트워크 오류 | 입력 유지, 재시도 |
| 로그아웃 실패 | 로그인 상태 유지, 오류 안내 |

내부 stack trace, SQL 메시지, token을 사용자 화면에 노출하지 않는다.

## 14. 테스트 및 완료 조건

### 자동 테스트

- 인증 상태 초기화와 세션 복원
- OAuth 시작/취소/오류
- callback 성공 및 code 중복 처리 방지
- 최초 가입과 기존 회원 구분
- 필수/선택 동의
- 내부 returnPath 검증
- 로그인 후 같은 partyId 복귀
- 비로그인 신청 시 로그인 유도
- 신청 성공/실패/중복
- 본인 신청 조회·취소
- 타인 신청 접근 차단
- 로그아웃 성공/실패
- 세션 만료
- 운영 설정 누락 시 fail-closed
- 기존 93개 UI E2E 회귀 유지

Mock 테스트와 실제 OAuth/DB 테스트 결과를 별도로 기록한다.

### 실제 통합 테스트

별도 테스트용 Kakao 계정과 Supabase 프로젝트에서 다음을 검증한다.

1. 신규 카카오 계정 로그인
2. Supabase Auth 사용자 생성
3. PartyConnect 동의 저장
4. 로그아웃 및 재로그인
5. 다른 페이지 이동과 새로고침 후 세션 유지
6. 실제 파티 신청 저장
7. 같은 계정의 신청 조회
8. 다른 브라우저에서 동일 계정 조회
9. 다른 회원 데이터 접근 차단
10. 신청 취소와 재조회

실제 OAuth/DB 테스트를 하지 않았다면 완료로 보고하지 않는다.

### 종료 기준

- [ ] 실제 Kakao OAuth 성공
- [ ] Supabase 세션 복원·갱신·로그아웃 성공
- [ ] 회원 동의 이력 서버 저장
- [ ] 로그인 후 원래 파티 복귀
- [ ] 실제 DB 신청·조회·취소
- [ ] 사용자 간 데이터 격리
- [ ] 관리자 비밀번호 하드코딩 제거 및 서버 권한 검증
- [ ] 기존 E2E 회귀 통과
- [ ] 모바일 Safari/Chrome 확인
- [ ] 운영 배포 SHA와 실제 테스트 대상 SHA 일치
- [ ] 미검증 항목이 별도로 보고됨

참고:
- Supabase Kakao provider: https://supabase.com/docs/guides/auth/social-login/auth-kakao
- Supabase redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Kakao Developers: https://developers.kakao.com/docs/latest/ko/kakaologin/common
- Backend PR #1: https://github.com/J-Hype-Labs/partylink/pull/1
