# 후속 에이전트 실행 지시: PartyConnect P0 통합/QA/배포

> **2026-11-07 02:14 KST 추가 필독:** [커밋 82893c7 코드 감사 및 차단 결함](./P0_QA_REVIEW_82893C7.md). 이후 작성된 이 감사에서 발견된 운영 모드 `setParties` 미정의, 서버 데이터 미표시, `provider` 미정의, `openMap` 미정의, force 테스트 잔존, 통합 브랜치 PR/CI 부재를 **가장 우선해 해결**한다. 현재 `fix/p0-integration-qa` 코드는 완료 판정 불가.


> **먼저 읽기:** [P0 통합 감사](./P0_INTEGRATION_STATUS_2026-11-07.md), `SPECIFICATION.md`, PR #4의 `PARTY_CONNECT_PAGE_IMPLEMENTATION_SPEC.md`, PR #5, #6, `J-Hype-Labs/partylink` PR #1. 이 문서는 **작업 계약**이다. 실제 상태는 최신 원격 GitHub 재조회로 판단.

## 임무

에이전트가 '완료'라고 보고한 UI를 **실제 운영 가능한 탐색·상세·신청 화면**으로 통합·검증하라. 작업물은 PR에 남기고 테스트 증거를 붙여라. 사용자가 한 번씩 오류를 지적할 때마다 고치는 방식이 아니라 정의된 검증을 전수 실행해라. 불필요한 UI 재설계나 새로운 기술 스택 도입은 피하라.

### 0. 착수 조건 (G0)

1. `J-Hype-Labs/party-connect-mvp` `main`, PR #3/#4/#5/#6 및 `J-Hype-Labs/partylink` PR #1의 **최신 커밋·변경 파일·검사 상태**를 재조회하고 상태표를 갱신.
2. 이전 UI 에이전트 작업은 이미 PR #4 `docs/party-connect-reference-page-p0` 브랜치에 `party-connect/index.html`, `js/party-data.js`, `tests/party-connect-page.spec.js` 등으로 반영되어 있다. **기존 UI를 버리고 다시 만들지 마라.**
3. UI PR #4는 현재 문서 전용이 아니다. 기존 PR 제목·본문·`ELI10_REPORT.md`의 '완료' 주장과 실제 근거를 정정.
4. 충돌하는 `index.html`을 맹목적으로 덮어쓰지 말고 PR #4 UI diff와 PR #5 OAuth/API diff를 기능 단위로 수동 통합. 백엔드 PR #1은 DB 소유자가 관리.
5. 본 작업은 승인 없는 main 직접 push/임의 머지/운영 자격증명 변경을 포함하지 않는다. **기능 구현 PR로 제출**.

### 1. UI/테스트의 명백한 결함부터 수정 (G1)

- `party-connect/index.html`은 자체 mock 카카오/네이버 `handleSocialLogin`, `openMyPage` 준비 중, `PARTY_LIST` 하드코딩 및 독립 localStorage 신청을 사용한다. 운영 기능이라고 표시하지 말 것.
- 카드 `article role="button"` 내부의 찜/신청 `button`을 분리해 중첩 상호작용과 키보드 포커스 충돌 방지. 클릭 대상은 안정적인 접근성 이름 또는 `data-testid`로 분명히 구분.
- `aria-current="page"`는 전용 경로에서만 설정. 모바일 홈에서 명시적 파티커넥트 진입 경로 확보.
- 실제로 사용 가능한 업체 연락처만 표시, 임의 확인 없는 `mailto:` 주소 및 사실 확인되지 않은 정원·성공 실적·후기는 운영 데이터처럼 보여주지 마라.
- 상세 모달 열림/닫힘 실패 원인을 브라우저 콘솔·DOM·이벤트·레이어에서 조사. Playwright `force:true`, `page.evaluate` 직접 이벤트, `waitForTimeout` 남용, `skip`, 느슨한 셀렉터로 덮지 마라.

### 2. 단일 인증·데이터·신청 계약 (G2)

- **실서비스 모드:** PR #5의 Supabase `PARTYLINK` 인증 모듈(카카오 OAuth/PKCE, 세션 복원, 로그아웃), `partylink-api` Edge Function, `applications` 조회·생성·취소·방문코드를 전용 페이지에서도 **공유 가능한 형태**로 사용.
- **데모 모드:** 화면·테스트 용도로만 로컬 데이터 허용. 화면에 '데모, 실제 신청 아님' 구분; 실서비스 API 실패 시 성공 토스트/로컬 fallback 금지.
- 메인과 새 화면의 동일 partyId, 선택 가능 회차, 모집 상태, 지역·요일 정규화, 신청 상태를 검증. PR #5의 `filteredParties` 의존성 및 `userId` 수정 보존.
- `js/party-data.js`가 실제 API 데이터를 대체하거나 `index.html`의 파티 데이터와 중복되어 불일치하면 단일 정규화 adapter로 대체. DB 스키마를 추측해 새로 만들지 말 것.
- 사용 중인 데모 `localStorage` 데이터를 파괴하지 말 것. 로그인/신청/마이페이지/기존 관리자 페이지 회귀 확인.
- 실카카오·실Supabase는 구성/배포 선행 없이는 **미검증**으로 유지. backend PR #1은 협업 담당의 적용 확인 후 검증하고 클라이언트 secret/service_role 키를 커밋 금지.

### 3. 재현 가능 E2E와 CI 게이트 (G3)

- `tests/comprehensive.spec.js`, `tests/party-connect-page.spec.js`, `tests/user-journey-regression.spec.js`(PR #6) **모두** CI에 실행 범위 포함. PR #4에 이미 전용 페이지 1개만 추가 실행하는 워크플로가 존재할 수 있으므로 중복 커맨드를 정리.
- 검증은 실제 응답/상태를 확인: 메인→전용 이동 및 뒤로가기; 직접 접근/새로고침; 검색 제목/업체/지역; 월~일; 지역; 복합 AND; 0건/초기화; 카드·상세·ESC/포커스 복귀; 폼 유효/무효 제출; 신청 유지/중복방지; 모집 마감; 로그인/마이페이지; 320/375/390/768/1280/1440에서 가로 overflow; console/pageerror.
- 필터 결과는 **fixture 데이터의 예상 파티 ID·카드 수**와 비교. 단순 버튼 존재/클릭/카드 하나 이상으로 PASS 판정하지 마라.
- `npx playwright test --list` 결과와 CI의 실제 실행 결과를 비교. `test:e2e:full`이 종합 테스트만 실행하는 현재 함정 수정.
- Chromium Desktop / Mobile Chrome / WebKit(Mobile Safari) **세 프로젝트**를 기준으로 각각 PASS/FAIL/SKIP 수를 명시. 기존 skip 제거 가능하면 제거하고 실패는 원인과 함께 남길 것.
- unit / parser / HTML 검사 / E2E / 스크린샷 / 배포 smoke 테스트를 분리하되 브랜치 CI가 필수 범위를 누락하지 않도록 한다.

### 4. UX·운영 배포 (G4)

- 저장소 `.agents/skills/ui-ux-pro-max/SKILL.md` 기준으로 실제 데스크톱·모바일 캡처를 만들고, 참조 페이지와 **정보 구조/사용자 탐색 경로**의 차이를 기록. 스킬을 호출했다는 사실만으로 품질 검증이라고 주장하지 마라.
- 모달 중첩·스크롤 잠금·키보드/터치·접근성·이미지 실패 fallback·가짜 클릭/무반응 버튼 점검.
- 변경 브랜치 CI의 SHA와 실제 브랜치 프리뷰/정적 서빙을 구분. 정식 Pages URL `https://j-hype-labs.github.io/party-connect-mvp/party-connect/`는 **main 병합/배포 후에만** 운영 검증으로 표기.
- 실제 운영 URL 직접 입력/새로고침/로고/뒤로가기/리소스 로드/JS 에러/필터/상세·신청을 확인한다.
- 테스트 통과만 위해 주요 기능을 삭제하거나 오류를 숨기는 수정은 금지.

### 5. 문서화 및 종료보고 (G5)

- PR #4 `ELI10_REPORT.md`의 'COMPLETE', 가짜 PASS, 없는 스크린샷 경로, CI/Pages 동일 SHA 주장을 실제 증거로 바꿔라. PR #4 본문에 구현 PR임을 명시.
- `SPECIFICATION.md`와 `README.md`는 기존 `main` 검증과 신규 UI/인증 검증을 **서로 구분**. 사용자 CTA에는 '파티 신청하기', '신청 완료', '모집 마감'을 사용. 내부 보존 데이터는 무단 삭제 금지.
- 통합 상태표 `docs/P0_INTEGRATION_STATUS_2026-11-07.md`의 항목마다 코드 참조, 테스트 ID, Actions URL, PR 및 커밋 SHA를 추가.
- 최종 응답은 ELI10 한국어로 다음 7개를 포함: 변경 파일/핸들러, PR·SHA, 기존 문제의 원인, 실제 테스트 3브라우저 결과, 캡처 링크, 배포 상태(검증/대기), 남은 운영 설정/담당자.
- **완료/부분완료/차단 중 하나만 판정**. FAIL 또는 필수 SKIP 존재, PR 미병합, 운영 실인증 미검증 등을 숨기지 말 것.

## 테스트 종료 조건

**G1** force 없는 실제 카드 클릭·모달·폼, 모바일 진입 정상. **G2** 데모/운영 API가 분리되고 로그인/신청 상태 동기화. **G3** 세 E2E 스위트 전부 CI 실행, 필수 기능 테스트 FAIL 0, SKIP 0, 브라우저별 실증. **G4** 배포 상태와 SHA 정확히 기록. **G5** 과장된 보고서와 PR 본문이 현재 사실과 일치.

우선 사용자가 하나씩 지적해야 하는 환경을 없애는 데 집중하라. 초기에 발견하지 못한 장애는 테스트에 재현 케이스를 추가해 다시 발생하지 않도록 한다.
