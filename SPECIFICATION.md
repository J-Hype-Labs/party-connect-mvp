# HypeConnect 통합 제품·기술 명세

- 기준일: 2026-11-08
- 기준 main: 9949f53567f033e269acc123d47b59cbd22ff254
- 저장소: https://github.com/J-Hype-Labs/party-connect-mvp
- 운영 메인: https://j-hype-labs.github.io/party-connect-mvp/
- 전용 페이지: https://j-hype-labs.github.io/party-connect-mvp/party-connect/
- 문서 진입점: docs/README.md

인증 세부 구현은 docs/AUTH_IMPLEMENTATION_SPEC.md, 인증 화면은 docs/AUTH_UI_UX_SPEC.md, 콘솔·배포 절차는 docs/AUTH_DEPLOYMENT_CHECKLIST.md를 기준으로 한다.

## 1. 제품 목표

HypeConnect는 사용자가 오프라인 소셜링 파티, 소개팅·혼술바 등의 파티를 탐색하고 신청할 수 있도록 연결하는 서비스다.

핵심 사용자 여정:

1. 파티 목록 탐색
2. 검색·지역·요일·카테고리 필터
3. 파티 상세 확인
4. 신청을 위한 카카오 로그인
5. 최초 서비스 이용 동의(필요한 경우)
6. 신청자 정보와 파티 신청 동의 입력
7. 서버 신청 접수
8. 마이페이지에서 신청 상태 확인

신청 접수와 파티 선정·참가 확정은 서로 다른 상태다. UI 문구와 데이터 상태에서 혼동하지 않는다.

## 2. 사용자와 권한

| 유형 | 허용 범위 | 현재 상태 |
|---|---|---|
| 비로그인 방문자 | 공개 파티 목록·상세 탐색 | UI 구현 |
| 일반 회원 | 로그인, 신청, 본인 신청 조회·취소 | 데모 UI 및 인증 코드 존재; 실서비스 미검증 |
| 점주/업체 운영자 | 파티 및 신청 운영 | 실서비스 화면/API 미완료 |
| 관리자 | 회원·파티·신청·후기 운영 | UI 일부 존재; 서버 권한 미완료 |

로그인 여부와 역할 권한은 별개다. 카카오로 로그인한 일반 회원에게 관리자나 점주 권한을 자동 부여하지 않는다.

## 3. 서비스 범위와 책임 경계

### HypeConnect가 처리하는 업무

- 카카오 계정 기반 회원 인증
- Supabase Auth 세션 및 회원 식별
- 서비스 이용약관 및 개인정보 처리 동의
- 파티 목록·상세 제공
- 회원 본인 신청·취소·조회
- 서버 역할에 따른 파티·신청 운영

### 명시적으로 처리하지 않는 업무

- 회원 인증을 위해 생년월일, 나이 또는 연령 확인 자료를 수집하지 않는다.
- 연령 판정, 성인인증 API, 관련 DB 필드·회원 상태·화면을 구현하지 않는다.
- 성인 여부와 신분증 확인은 파티 현장 운영자가 담당한다. HypeConnect 회원 인증과 별도 업무다.
- 카카오 로그인을 실명·전화번호 소유 확인으로 간주하지 않는다.

## 4. 주요 화면

### 메인 페이지

- 공통 헤더와 히어로 배너
- 파티 및 후기 콘텐츠
- 파티 목록과 필터
- 상세·신청 모달
- 로그인 및 마이페이지 진입
- 관리자 UI(현재 브라우저에 관리자 비밀번호 상수 존재)

### 전용 페이지

- Hero, 검색, 요일·지역·카테고리 필터
- 파티 카드 그리드 및 빈 상태
- 상세 모달, 지도 링크, 신청
- 마이페이지 및 제휴 안내

전용 페이지의 기능 기준은 HYPECONNECT_PAGE_IMPLEMENTATION_SPEC.md를 참조한다.

## 5. 현재 구현 상태

2026-11-08 main SHA 9949f53 기준:

| 영역 | 상태 | 근거/제약 |
|---|---|---|
| 메인·전용 페이지 | 배포됨 | GitHub Pages workflow 성공 |
| 메뉴 통합·네이버 제거 | 배포됨 | PR #8 병합 |
| 검색·필터·상세 UI | 구현됨 | 기존 E2E 일부 흐름 검증 |
| 공통 Auth 모듈 | 코드 존재 | 실제 Kakao OAuth 미검증 |
| PKCE 및 세션 코드 | 코드 존재 | 실제 계정/콜백 흐름 미검증 |
| OAuth callback 페이지 | 코드 존재 | loginWithKakao의 redirectTo와 연결 여부 미검증 |
| OnboardingScreen | 컴포넌트 존재 | 실제 callback/페이지 연결 미검증 |
| /me, /me/onboarding | 프런트엔드 호출 존재 | 백엔드 handler에 구현되지 않음 |
| 실제 Supabase 설정 | 미완료 | URL/공개 키 공란 |
| PartyLink Edge Function | PR #1에 코드 존재 | OPEN, 미병합 |
| 실제 DB migration/RLS | 운영 적용 미확인 | 스테이징·운영 검증 필요 |
| 관리자 인증 | 차단 | index.html에 ADMIN_PASSWORD 상수 존재 |
| 실서비스 회원 운영 | 차단 | OAuth·API·관리자 보안 미검증 |

## 6. 기술 아키텍처

### 프런트엔드

- index.html: 메인 페이지
- party-connect/index.html: 파티 탐색 페이지
- auth/callback/index.html: OAuth callback UI
- js/auth-client.js: Supabase client, 환경 판정, API helper
- js/auth-service.js: 로그인, callback, 세션 복원, 로그아웃, 복귀 URL
- js/auth-ui.js: 로그인 모달, 가입 동의, 오류/환영 UI
- js/party-api.js: 파티·신청·마이페이지 API
- js/party-data.js: 공통 데모 파티 데이터

### 인증 및 데이터

- Supabase Auth Kakao OAuth, PKCE
- Supabase Edge Function partylink-api
- PostgreSQL: stores, party_slots, guests, applications, deposit_histories
- 브라우저에는 공개용 Supabase 키만 허용
- service_role 키는 Edge Function에서만 사용

백엔드 PR #1은 아직 main에 병합되지 않았다. 실제 운영 배포로 간주하지 않는다.

## 7. 인증 및 회원 데이터 규칙

- Supabase auth.users.id를 회원 고유 식별자로 사용한다.
- 이메일은 제공 여부가 보장되지 않는 선택 정보다.
- 이름과 연락처는 신청 처리에 필요한 시점에 수집한다.
- 클라이언트가 보낸 user_id/guest_id를 권한 판단에 사용하지 않는다.
- Edge Function은 access token을 검증하고 auth user ID로 데이터를 연결한다.
- 회원은 본인 신청만 조회·취소할 수 있어야 한다.
- 중복 신청·모집 마감·정원 초과는 서버와 DB에서 검증한다.
- 가입 동의는 서버에 버전과 시각을 저장해야 한다. 현재 /me/onboarding은 미구현이다.
- 데모 localStorage와 실서비스 DB를 혼합하지 않는다.

## 8. 신청 상태

- APPLIED: 신청 접수/선정 대기
- APPROVED: 선정 완료
- VISITED: 방문 확인
- MISSION_SUBMITTED: 미션 제출
- COMPLETED: 완료
- CANCELLED: 신청 취소
- REJECTED: 선정되지 않음
- NOSHOW: 미방문

신청 접수만으로 참가 확정이라고 안내하지 않는다.

## 9. 비기능 요구사항

- 비밀키 및 토큰 로그 노출 금지
- 브라우저에 service_role 또는 Kakao Client Secret 포함 금지
- API 권한 서버 검증
- RLS와 Edge Function 권한 분리
- 운영 환경의 demo fallback 금지
- 오류와 빈 데이터 상태 구분
- 키보드 접근성, focus 표시, 44px 이상 터치 영역
- 320~1440px 반응형 검증
- 실제 신청 성공은 서버 응답 후에만 표시
- 개인정보 최소 수집 및 처리방침 고지

## 10. 우선순위

### P0: 실제 인증과 데이터 안전성

1. 공통 Auth 모듈 안정화
2. loginWithKakao의 redirectTo와 callback page 연결
3. 신규/기존 회원 온보딩 실제 연결
4. /me 및 /me/onboarding API와 DB 동의 기록 구현
5. 로그인 후 원래 파티 복귀
6. PartyLink migration/Edge Function 통합
7. 본인 신청 조회·취소 및 RLS 검증
8. production demo override 제거 및 fail-closed
9. 관리자 비밀번호 하드코딩 제거와 서버 권한 검증
10. 실제 OAuth/DB 및 모바일 통합 테스트

### P1: 운영 도구

- 관리자 파티 CRUD 서버 연동
- 점주용 선정·방문 확인
- 방문 검증과 정산 원자성
- 후기 작성 권한 및 실제 방문 상태 연결
- 알림·찜·후기의 회원 계정 동기화

### P2: 구조 개선

- 단일 HTML 점진적 모듈 분리
- 번들러/프레임워크 전환은 별도 설계·승인
- 성능·접근성·운영 관측성 개선

## 11. 문서와 상태 관리

- 제품/기술 범위: 본 문서
- 인증 구현/API/보안: docs/AUTH_IMPLEMENTATION_SPEC.md
- 인증 화면/상태: docs/AUTH_UI_UX_SPEC.md
- 콘솔/배포: docs/AUTH_DEPLOYMENT_CHECKLIST.md
- 전용 페이지: HYPECONNECT_PAGE_IMPLEMENTATION_SPEC.md
- 디자인 결정: UI_UX_DECISION_RECORD.md
- 시점별 현황: ELI10_REPORT.md

상태는 구현·검증됨, 코드 존재·실서비스 미검증, 미구현, 차단으로 구분한다. 코드와 문서가 다르면 최신 main과 실제 Actions를 확인해 문서를 갱신한다.
