# HypeConnect UI/UX 결정 기록

- 기준일: 2026-11-08
- main SHA: 9949f53567f033e269acc123d47b59cbd22ff254
- 인증 UI 상세: docs/AUTH_UI_UX_SPEC.md
- 전용 페이지 기준: HYPECONNECT_PAGE_IMPLEMENTATION_SPEC.md

## 1. 디자인 방향

- Pattern: Hero-centric discovery
- Style: Vibrant & block-based
- 우선순위: 모바일 탐색, 명확한 CTA, 빠른 필터링, 상세 정보의 맥락 유지
- 브랜드: 기존 rose 계열과 Pretendard 유지

전용 페이지 기본 흐름: Hero → Search → Filters → Party Grid → Empty State → Partnership.

## 2. 실제 코드 기준 토큰

| 토큰 | 값 | 역할 |
|---|---|---|
| Primary | #E11D48 | 브랜드 CTA, 선택 상태 |
| Secondary | #FB7185 | 보조 강조 |
| Accent | #F59E0B | 이벤트·보조 강조 |
| Background | #FFFFFF | 기본 배경 |
| Surface | #FAFAFA | 보조 표면 |
| Text | #18181B | 본문 |
| Muted | #71717A | 보조 텍스트 |
| Border | #E4E4E7 | 경계 |
| Font | Pretendard | 기본 글꼴 |

## 3. 페이지 레이아웃 결정

### 검색·필터
- 검색은 제목·업체명·지역
- 요일 칩은 모바일 가로 스크롤 허용
- 지역 선택은 모바일 바텀시트/데스크톱 중앙 모달
- 활성 필터는 시각적으로 명확히 표시
- 빈 결과에는 조건 변경 또는 초기화 제공

### 카드
- 모바일 1열, 중간 폭 2열, 데스크톱 3열
- 이미지 비율과 카드 높이 일관성
- 제목과 일정은 빠르게 읽히게 배치
- 모집 상태는 텍스트와 시각 요소를 함께 사용
- 찜 버튼과 상세 클릭 영역 분리

### 상세 모달
- 이미지, 제목, 일정, 장소, 혜택, 모집 현황
- 주요 CTA: 파티 신청하기
- 보조 행동: 지도 보기
- ESC/닫기/배경 클릭
- 모달 열림 시 배경 스크롤 잠금

## 4. 인증 UI 결정

세부 기준은 docs/AUTH_UI_UX_SPEC.md를 따른다.

- 카카오 로그인만 표시
- 비로그인 상태에서도 공개 파티 탐색 허용
- 신청 시 로그인 모달을 열고 원래 파티를 기억
- 로그인 처리 중 중복 실행 방지
- 로그인 성공, 가입 완료, 신청 접수를 각각 다른 상태로 표시
- 서버 응답 전 성공 토스트 금지
- 필수 약관과 선택 마케팅 동의 분리
- 실제 OAuth 미설정/실패를 데모 성공으로 위장하지 않음

### 현재 구현 차이

- 공통 로그인 UI는 js/auth-ui.js에 추가됨
- OnboardingScreen 컴포넌트가 export되지만 callback/페이지에서 실제 연결되었는지 미검증
- KakaoLoginButton은 현재 흰색 배경이며, 공식 카카오 버튼 가이드와 시각적 정합성 검토 필요
- callback 오류 화면의 재시도/복귀 UI 연결 미검증

## 5. 책임 경계

HypeConnect 회원 인증은 카카오 계정과 Supabase Auth를 통한 계정 식별이다. 생년월일·나이·연령 확인 자료를 수집하거나 관련 화면/API/DB 상태를 만들지 않는다. 성인 여부와 신분증 확인은 파티 현장 운영자의 책임이다.

## 6. 접근성

- 최소 터치 영역 44×44px
- 아이콘 버튼 accessible name
- focus 표시
- h1 > h2 > h3 제목 계층
- 모달 focus trap과 포커스 복귀
- ESC 닫기
- 오류 메시지와 입력 필드 연결
- prefers-reduced-motion
- 색상만으로 상태 전달 금지

WCAG AA 완전 검증이라는 주장은 자동·수동 측정 증거가 있을 때만 사용한다.

## 7. UI/UX Pro Max

저장소의 .agents/skills/ui-ux-pro-max는 설계 참고 자료다. 스킬 실행 사실만으로 화면 품질을 보증하지 않는다.

향후 인증 구현 PR에는:
- 실제 디자인 토큰 적용 근거
- 데스크톱·모바일 캡처
- 로그인/온보딩/callback 오류/신청 완료 화면
- 접근성 점검
- 브라우저 테스트와 미해결 UX 이슈

## 8. 현재 검증 상태

| 항목 | 상태 |
|---|---|
| 메인·전용 페이지 배포 | 완료 |
| 이전 main의 3개 E2E 스위트 | 93/93 PASS |
| 신규 Auth 모듈 syntax/CI | 최신 CI 실행 확인 필요 |
| 실제 Kakao OAuth | 미검증 |
| callback route 연결 | 미검증 |
| 온보딩 실제 저장 | 미구현/미검증 |
| 모든 검색·필터 결과 조합 | 일부 미검증 |
| 관리자 실서비스 인증 | 차단 |
| 전체 해상도 접근성 수동 감사 | 추가 검증 필요 |
