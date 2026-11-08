# PartyConnect 통합 제품·기술 명세

- 기준일: 2026-11-08
- 저장소: https://github.com/J-Hype-Labs/party-connect-mvp
- 운영 메인: https://j-hype-labs.github.io/party-connect-mvp/
- 파티 페이지: https://j-hype-labs.github.io/party-connect-mvp/party-connect/
- 문서 진입점: docs/README.md

이 문서는 제품 범위와 기술 구조의 상위 기준이다. 카카오 OAuth의 세부 구현은 docs/AUTH_IMPLEMENTATION_SPEC.md, 화면 규칙은 docs/AUTH_UI_UX_SPEC.md, 콘솔·배포 절차는 docs/AUTH_DEPLOYMENT_CHECKLIST.md를 기준으로 한다.

## 1. 제품 목표

PartyConnect는 사용자가 오프라인 소셜링 파티, 소개팅·혼술바 등 공개된 파티를 탐색하고 신청할 수 있도록 연결하는 서비스다.

핵심 사용자 여정:

1. 파티 목록 탐색
2. 검색·지역·요일·카테고리 필터
3. 파티 상세 확인
4. 신청을 위한 카카오 로그인
5. 신청자 정보와 필요한 동의 입력
6. 서버 신청 접수
7. 마이페이지에서 신청 상태 확인

신청 접수와 파티 선정·참가 확정은 서로 다른 상태다. UI 문구와 데이터 상태에서 혼동하지 않는다.

사업 모델의 업체 수수료, 방문 확인, 정산 등은 실제 운영 정책이 확정되기 전까지 가설 또는 별도 운영 기능으로 표시한다. 신청만으로 업체에 비용을 청구하지 않는다.

## 2. 사용자와 권한

| 사용자 유형 | 허용 범위 | 현재 상태 |
|---|---|---|
| 비로그인 방문자 | 공개 파티 목록·상세 탐색 | UI 구현 |
| 일반 회원 | 로그인, 신청, 본인 신청 조회·취소 | 데모 동작; 실서비스 미검증 |
| 점주/업체 운영자 | 파티 및 신청 운영 | 전체 실서비스 화면/API 미완료 |
| 관리자 | 회원·파티·신청·후기 운영 | UI 일부 존재; 인증·권한 보안 미완료 |

로그인 여부와 역할 권한은 별개다. 카카오로 로그인한 일반 회원에게 관리자나 점주 권한을 자동 부여하지 않는다.

## 3. 서비스 범위와 책임 경계

### 서비스가 처리하는 것

- 카카오 계정 기반 회원 인증
- Supabase Auth 세션과 회원 식별
- 서비스 약관 및 개인정보 처리 동의
- 파티 목록·상세 제공
- 회원 본인 신청·취소·조회
- 운영자 권한에 따른 파티 및 신청 처리(향후 서버 권한 구현)

### 명시적으로 처리하지 않는 것

- PartyConnect는 회원 인증 과정에서 생년월일, 나이, 연령 확인 자료를 수집하지 않는다.
- 연령 판정, 성인인증 API, 연령 관련 DB 필드·회원 상태·화면을 구현하지 않는다.
- 성인 여부와 신분증 확인은 파티 현장 운영자가 담당한다. PartyConnect의 계정 인증·신청 기능과 분리한다.
- 카카오 로그인을 실명, 전화번호 소유 또는 연령 확인으로 간주하지 않는다.

## 4. 주요 화면과 기능

### 메인 페이지

- 공통 헤더, 히어로 배너
- 파티 및 후기 콘텐츠
- 파티 목록과 필터
- 상세·신청 모달
- 로그인/마이페이지 진입
- 관리자 UI(현재 클라이언트 하드코딩 비밀번호 위험 존재)

### 파티커넥트 전용 페이지

- 히어로 및 소개
- 검색 입력
- 요일 칩
- 지역 선택 모달
- 카테고리 필터
- 파티 카드 그리드
- 빈 결과 상태
- 상세 모달 및 지도 링크
- 신청 흐름
- 마이페이지 신청 내역
- 제휴 안내

전용 페이지의 세부 동작과 회귀 기준은 PARTY_CONNECT_PAGE_IMPLEMENTATION_SPEC.md를 참조한다.

## 5. 현재 구현 상태

2026-11-08 확인 기준:

| 영역 | 상태 | 근거/제약 |
|---|---|---|
| 메인·전용 페이지 배포 | 구현·배포됨 | main SHA 0942af4 |
| 메뉴 통합·네이버 제거 | 배포됨 | PR #8 병합 |
| 검색·필터·상세 UI | 구현됨 | E2E로 일부 흐름 검증 |
| 데모 로그인·localStorage | 구현됨 | CI에서 데모 사용자 여정 검증 |
| Supabase Auth 코드 | 코드 존재 | 실제 카카오 OAuth 미검증 |
| 실제 Supabase 설정 | 미완료 | 두 페이지 설정값 공란 |
| PartyLink Edge Function | 코드가 PR #1에 있음 | 백엔드 PR #1 OPEN, 미병합 |
| DB migration 및 RLS | PR #1 검토 대상 | 운영 DB 적용 여부 미확인 |
| 회원 가입 동의 이력 | 미구현/확인 필요 | 별도 영속 테이블·API 필요 |
| 관리자 권한 | 차단 | index.html에 관리자 비밀번호 상수 존재 |
| 실제 회원 데이터 운영 | 차단 | OAuth·DB·관리자 보안 검증 전 |

## 6. 기술 아키텍처

### 프런트엔드

- 두 개의 독립 HTML 진입점: index.html, party-connect/index.html
- React 18 UMD, ReactDOM, Babel Standalone
- Tailwind CSS CDN, Lucide, Pretendard
- 공통 파티 데이터: js/party-data.js
- GitHub Pages 정적 호스팅

### 인증 및 데이터

- Supabase Auth의 Kakao OAuth, PKCE
- Supabase Edge Function partylink-api
- PostgreSQL 테이블: stores, party_slots, guests, applications, deposit_histories
- 공개 파티 조회와 인증된 본인 신청 API를 분리
- 브라우저에는 공개용 Supabase 키만 허용
- service_role 키는 Edge Function에서만 사용

백엔드 PR #1의 migration과 handler가 아직 main에 병합되지 않았으므로, 운영 연결 완료로 표시하지 않는다.

### 배포와 CI

- main push 시 GitHub Pages 배포
- CI: HTML 필수 요소, JSX 파싱, 외부 CDN, 배포 설정, Playwright
- 현재 main 기준 CI 및 Pages workflow 성공
- CI가 검증하지 않는 실제 OAuth·운영 DB·관리자 권한은 별도 테스트 필요

## 7. 인증·회원 데이터 규칙

세부 사항은 docs/AUTH_IMPLEMENTATION_SPEC.md를 기준으로 한다.

- Supabase auth.users.id가 회원의 고유 식별자다.
- 이메일은 제공 여부가 보장되지 않는 선택 정보다.
- 신청자 이름과 연락처는 실제 신청 처리에 필요한 시점에 수집한다.
- 클라이언트가 보낸 user_id/guest_id를 권한 판단에 사용하지 않는다.
- 서버는 access token을 검증하고 그 결과의 user.id로 데이터를 연결한다.
- 회원은 본인 신청만 조회·취소할 수 있다.
- 중복 신청, 모집 마감, 정원 초과는 서버와 DB에서 검증한다.
- 동의 이력은 버전·종류·시각을 서버에 저장한다.
- 데모 localStorage 데이터와 실서비스 DB 데이터를 혼합하지 않는다.

## 8. 신청 상태와 표시

백엔드 실제 상태값을 기준으로 UI 라벨을 매핑한다. 상태값을 프런트엔드 임의 문자열로 생성하지 않는다.

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

- 인증 토큰 및 비밀키 로그 노출 금지
- 공개 브라우저 코드에 service_role 또는 Kakao Client Secret 포함 금지
- API 권한 서버 검증
- RLS와 Edge Function 권한 분리
- 운영 환경의 demo fallback 금지
- 오류와 빈 데이터 상태 구분
- 키보드 접근성, 포커스 표시, 44px 이상 터치 영역
- 320~1440px 범위의 반응형 검증
- 실제 신청 성공은 서버 응답 후에만 표시
- 개인정보 최소 수집 및 처리방침 고지

## 10. 우선순위

### P0: 실서비스 인증과 데이터 안전성

1. 공통 Auth 모듈과 실제 Kakao OAuth
2. PKCE callback 및 세션 복원
3. 가입 동의 서버 저장
4. 로그인 후 원래 파티 복귀
5. PartyLink migration/Edge Function 통합
6. 신청·조회·취소의 회원별 권한 검증
7. production demo 강제 경로 제거 및 fail-closed
8. 관리자 비밀번호 하드코딩 제거와 서버 권한 검증
9. 실제 OAuth/DB 및 모바일 통합 테스트

### P1: 운영 도구

- 관리자 파티 CRUD의 서버 연동
- 점주용 선정·방문 확인
- 방문 검증과 정산 원자성
- 후기 권한 및 실제 방문 상태 연결
- 알림·찜·후기의 사용자 계정 동기화

### P2: 구조 개선

- 단일 HTML 점진적 모듈 분리
- 번들러/프레임워크 전환은 별도 설계·승인
- 성능, 캐시, 접근성 및 운영 관측성 개선

## 11. 문서와 상태 관리

- 제품/기술 범위: 본 문서
- 인증 동작/API/보안: docs/AUTH_IMPLEMENTATION_SPEC.md
- 인증 화면/상태/반응형: docs/AUTH_UI_UX_SPEC.md
- 콘솔/마이그레이션/배포: docs/AUTH_DEPLOYMENT_CHECKLIST.md
- 페이지 동작: PARTY_CONNECT_PAGE_IMPLEMENTATION_SPEC.md
- 디자인 결정: UI_UX_DECISION_RECORD.md
- 시점별 현황: ELI10_REPORT.md

상태 표기:
- **구현·검증됨:** 코드와 테스트 증거가 있음
- **코드 존재·실서비스 미검증:** 구현 흔적은 있으나 실제 계정/DB 검증 없음
- **미구현:** 코드 또는 운영 기능 없음
- **차단:** 보안·설정 등 선행조건 때문에 운영 불가

문서와 코드가 다르면 최신 코드와 검증 증거를 조사해 문서를 갱신한다. 추측으로 완료를 선언하지 않는다.
