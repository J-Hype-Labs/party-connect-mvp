# HypeConnect 전용 페이지 구현 및 유지보수 명세

- 기준일: 2026-11-08
- main 기준 SHA: 9949f53567f033e269acc123d47b59cbd22ff254
- 운영 URL: https://j-hype-labs.github.io/party-connect-mvp/party-connect/
- 코드: party-connect/index.html
- 공통 데이터: js/party-data.js
- 공통 인증: js/auth-client.js, js/auth-service.js, js/auth-ui.js
- API 어댑터: js/party-api.js

이 문서는 구현 전 작업 지시서가 아니라 배포된 전용 페이지의 기능 기준과 회귀 보호 명세다.

## 1. 확정 요구사항

1. 러브커넥트 독립 메뉴 제거
2. 체험단 독립 메뉴 제거
3. HypeConnect 메뉴는 전용 페이지로 연결
4. 사용자 신청 CTA는 파티 신청하기, 접수 상태는 신청 완료로 통일
5. 기존 파티·신청·후기·찜·관리자 데이터 보존
6. 로고·로그인·알림·마이페이지·커뮤니티/제휴 진입점 유지
7. 네이버 로그인은 제공하지 않고 카카오 로그인만 지원

## 2. 페이지 구조

1. 공통 헤더
2. Hero 소개
3. 검색 입력
4. 요일 필터
5. 지역 필터
6. 카테고리 필터
7. 파티 카드 그리드
8. 결과 없음 상태
9. 파트너십 안내
10. 푸터

상세는 모달로 표시해 탐색 맥락을 유지한다.

## 3. 탐색과 필터

- 검색 대상: 제목, 업체명, 지역
- 요일: 전체 및 월~일
- 지역: 전체, 서울, 경기·인천, 지방/기타 및 세부 지역
- 카테고리: 공통 데이터 정의와 일치
- 조건 조합: 검색어·요일·지역·카테고리 교차 적용
- 하나의 필터 변경이 나머지 선택을 임의 초기화하지 않음
- 결과 수와 실제 카드 수가 일치
- 결과가 없으면 빈 상태와 필터 초기화 제공

## 4. 카드 및 상세 모달

- 실제 데이터의 제목·지역·일정·카테고리·모집 상태 표시
- 상세 클릭 영역과 찜/신청 버튼을 분리
- 마우스 및 키보드 Enter/Space 동작
- ESC·닫기 버튼·배경 클릭으로 닫기
- 모달 표시 중 배경 스크롤 잠금
- 이미지 실패 시 대체 이미지
- 실제 주소 기반 지도 링크
- 모집 마감 파티는 신청 불가 상태 표시

## 5. 인증 및 신청 흐름

현재 main에는 공통 Auth 모듈이 추가되었다.

- js/auth-client.js: Supabase 설정과 client
- js/auth-service.js: loginWithKakao, handleCallback, restoreSession, logout, return URL
- js/auth-ui.js: LoginModal, OnboardingScreen 등
- js/party-api.js: 파티 및 신청 API

다만 다음 항목은 아직 미검증 또는 미완료다.

1. loginWithKakao는 현재 페이지 URL을 redirectTo로 사용하며 auth/callback/ 페이지를 실제 redirect target으로 연결했는지 확인이 필요하다.
2. callback은 신규 가입자를 메인 페이지의 onboarding query로 이동시키지만, 실제 OnboardingScreen 연결은 미검증이다.
3. /me 및 /me/onboarding API는 백엔드 PR #1에 구현되어 있지 않다.
4. Supabase 설정값이 비어 있어 실제 카카오 OAuth는 실행 검증되지 않았다.
5. production URL 파라미터 demo override와 관리자 비밀번호 하드코딩이 남아 있다.

목표 사용자 흐름:

파티 상세 → 신청하기 → 카카오 로그인 → 최초 동의(필요 시) → 같은 파티 신청서 → 서버 신청 → 접수 결과 → 마이페이지

로그인 전 파티 탐색은 허용한다. 신청 성공은 서버 응답 후에만 표시한다. APPLIED는 선정 대기가 아닌 신청 접수 상태이며, 선정 확정으로 오해하게 표시하지 않는다.

회원 인증에 생년월일·나이·연령 확인 필드/API/DB 상태를 추가하지 않는다. 현장 확인은 파티 운영자의 책임이다.

## 6. 데이터 원칙

- 메인과 전용 페이지는 js/party-data.js를 공통 데모 데이터 출처로 사용
- 실서비스 모드에서는 서버 API 결과가 원본
- 빈 API 응답을 fixture로 대체하지 않음
- API 오류와 빈 목록을 구분
- localStorage 데모 데이터와 실제 DB 데이터 혼합 금지
- 기존 저장 키와 회원 데이터 무단 초기화 금지

## 7. 반응형 및 접근성

검증 폭: 320, 375, 390, 768, 1280, 1440px.

- 모바일 1열, 중간 화면 2열, 데스크톱 3열
- 가로 스크롤, 텍스트 잘림, CTA 가림 방지
- 터치 대상 최소 44×44px
- 아이콘 버튼 accessible name
- 모달 포커스 이동/복귀
- prefers-reduced-motion
- 색상 외 텍스트로 모집 상태 전달

## 8. 테스트 기준

기존 main SHA 0942af4의 CI는 3개 스위트에서 93/93 PASS했다. 이후 SHA 9949f53에서 Auth 모듈과 callback이 추가되었으므로, 이전 테스트 결과를 신규 인증 코드의 검증 증거로 사용하지 않는다.

필수 신규 테스트:
- 실제 OAuth callback route
- 로그인 취소/오류
- 신규 회원 온보딩 표시 및 저장
- 가입 후 원래 partyId 복귀
- /me 및 /me/onboarding API
- 세션 복원/로그아웃
- 본인 신청 조회·취소
- 다른 회원 데이터 접근 거부
- production 설정 누락 및 demo query 차단

## 9. 변경 금지

- 메뉴 정리를 이유로 원본 신청/후기/파티 데이터를 삭제하지 않는다.
- '체험단' 문자열 무차별 전역 삭제 금지.
- 네이버 로그인 신규 UI/인증 경로 재추가 금지.
- 인증 모듈을 페이지별로 복제하지 않는다.
- 테스트 삭제·skip·force click·assertion 완화 금지.
- 실제 OAuth/DB 미검증 상태를 운영 완료로 표시하지 않는다.

## 10. 증거 링크

- PR #8: https://github.com/J-Hype-Labs/party-connect-mvp/pull/8
- 최신 Pages: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42472345956
- 최신 CI: https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42472346425
- 인증 상세: docs/AUTH_IMPLEMENTATION_SPEC.md
