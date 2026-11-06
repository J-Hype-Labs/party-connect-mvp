# P0 통합 QA 후속 감사: 커밋 `82893c7`

> 점검: 2026-11-07 02:14 KST. 브랜치 `fix/p0-integration-qa`, SHA `82893c75c0ae3293405490e1de548c4d5bccf0d3`.
> **정적 코드 감사 + GitHub PR/Actions 조회 결과**. 이번 감사에서 E2E를 새로 실행한 것은 아니며, 로컬 52 PASS 주장은 에이전트 보고일 뿐 GitHub 검증 증거가 아니다.
> 기존 점검: [P0_INTEGRATION_STATUS_2026-11-07.md](./P0_INTEGRATION_STATUS_2026-11-07.md). 구현 실행 계약: [NEXT_AGENT_IMPLEMENTATION.md](./NEXT_AGENT_IMPLEMENTATION.md).

## A. 현재 GitHub 사실

- `fix/p0-integration-qa` 브랜치 커밋 `82893c7` **원격 존재**, 단일 커밋에서 **6개 파일만 변경**: `.github/workflows/ci.yml`, `index.html`, `package.json`, `party-connect/index.html`, `tests/party-connect-page.spec.js`, `tests/user-journey-regression.spec.js`.
- 기존 PR #4 (전용 UI), #5 (카카오/DB 프런트), #6 (QA), #7 (문서), 백엔드 `partylink` #1 **모두 미병합**. 새 `fix/p0-integration-qa`용 **PR 없음**. `main`은 `6b56560`, 신규 Pages 배포 아님.
- 2026-11-07 점검 시 이 커밋 `82893c7`에 해당하는 GitHub Actions run은 확인되지 않음. CI는 `push: main` / `pull_request: main`만 트리거하므로 별도 브랜치 push만으로 자동 실행되지 않는다.
- 예전 PR #4 CI [Run 42245297056](https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42245297056)는 **success**로 바뀌었으나 검증 SHA는 `129873a`. 이 결과를 `82893c7`에 전용하면 안 된다.
- `82893c7` 커밋에는 README/명세/ELI10/디자인 문서 변경이 **없음**. 해당 브랜치에 `docs/P0_INTEGRATION_STATUS_2026-11-07.md`가 존재하지 않음(문서 PR #7과 통합되지 않음). 보고의 '문서 모두 갱신'은 증명되지 않음.

## B. 코드에서 확인된 BLOCKER (복사 가능한 점검 위치)

| 우선 | 근거 | 문제 / 기대 수정 |
|---|---|---|
| P0 | `party-connect/index.html:228` | `refreshParties`가 `setParties(await api("parties"))`를 호출하지만 **해당 컴포넌트에 `[parties,setParties]` 선언 없음**. 라이브 조회 중 ReferenceError 위험. |
| P0 | `party-connect/index.html:422-445` | 목록 생성에 항상 `PARTY_LIST.filter` 사용. 서버 파티 수신해도 UI 반영 안 됨. **단일 state + 데모/실서비스 어댑터 + 파티 ID/요일/지역/모집수/이미지 스키마 정규화** 필요. |
| P0 | `party-connect/index.html:317-322` | 데모 `handleSocialLogin()`에서 **미정의 `provider` 변수로 토스트 텍스트 계산**, 로그인 후 JS ReferenceError. '데모 로그인 PASS'와 충돌. |
| P0 | `party-connect/index.html:664` | '지도 보기' 클릭 시 **미정의 `openMap` 함수 호출**. 렌더/버튼 노출 검사만으로 파악할 수 없는 기능 오류. |
| P0 | `party-connect/index.html:328-331` | `openMyPage`가 '마이페이지 준비 중' 토스트만 표시. PR #5의 실제 신청 내역/취소/방문 코드 보기 **전용 페이지에 미통합**. |
| P0 | `party-connect/index.html:717-722` | 실제 이용 불가한 네이버 버튼 노출. `handleSocialLogin('naver')`는 인수를 받지 않아도 카카오를 호출하는 코드. 제거 또는 정확한 지원 상태 표시. |
| P0 | `party-connect/index.html:704` 근방 | 라이브 신청 후에도 완료 화면에 고정 '(데모 모드...)' 문구. 실제 완료/실패/재시도, 로그인 유도 분기 점검 필요. |
| P0 | `index.html:274`, `js/party-data.js:3` | 같은 초기 파티 데이터가 **각각 하드코딩**. 메인 `index.html`은 로컬 `PARTY_LIST`를 사용하고 전용 페이지만 공유 JS 로드. 단일 소스 주장 거짓. |
| P0 | `tests/party-connect-page.spec.js` | 상세 닫기에 아직 `click({ force: true })`. 'force 전부 제거' 주장 거짓. 요일 테스트는 필터 후 카드 수>0만 확인. |
| P0 | `tests/comprehensive.spec.js:62,69,248,254` | 메인 페이지 상세 테스트에도 `force:true` 유지. UI 변경에 맞춰 안정적인 role/testid 기반 실제 클릭으로 변경. |
| P0 | `scripts/validate-jsx.js` | `index.html` 하나만 JSX 구문 검사. 전용 `party-connect/index.html`의 문법 검사 CI 필수 추가. |
| P1 | `party-connect/index.html:161-177,183-197` | 라이브 모드에서도 로컬 `applications`·`currentUser` 초기값을 읽고 localStorage에 다시 쓰므로 세션 복원 전 오래된 유저/신청정보가 노출될 가능성. 라이브 모드 로컬 인증 데이터 미사용/정리. |
| P1 | `party-connect/index.html:663` | `className="... ${...}"` 일반 문자열 안에 삼항 텍스트가 들어가 스타일 분기가 작동하지 않음. JSX 표현식으로 수정. |
| P1 | `PARTYLINK_CONFIG` 양쪽 HTML 별도 선언 | 설정 변경 시 한 페이지에만 적용될 수 있음. 공개 키 설정 한 곳에서 관리하되 secret/service_role 금지. |
| P1 | `package.json` / `.github/workflows/ci.yml` | CI에 3개 스위트 실행 단계는 **코드 추가**됐으나 `test:e2e:full`은 여전히 종합 스위트만 실행. 스위트 전체 게이트 통합 및 PASS/FAIL/SKIP 재검증. |

## C. 즉시 수정 테스트

테스트를 실동작 중심으로 추가하거나 강화한다.

1. `?live=1` + 안전한 로컬 API/Auth fixture로 **서버에서 반환하는 파티 A/B만 화면에 렌더**, 고정 `PARTY_LIST`는 표시되지 않음 확인. 서버 목록 업데이트/에러/빈 목록도 검증. `pageerror` 0건.
2. 데모 카카오 버튼 실제 클릭→로그인 상태→새로고침→로그아웃. 콘솔 오류 0.
3. 지도 보기 버튼 실제 클릭→지도 모달 또는 정상 링크로 이어짐. 정의되지 않은 함수 참조 없음.
4. 마이페이지 실제 동작(운영 모드 신청 목록/상태·취소, 데모 모드 표시), 다른 경로 방문 후 세션 일관성.
5. 전체 `force: true` 제거, 실제 카드·모달 열림/닫힘·ESC·백드롭 테스트. `skip` 대신 실패 원인 수정.
6. 검색/요일/지역 AND 조합 기대 **파티 ID 및 결과 수** 비교. 0건/초기화 포함.
7. 양쪽 페이지 `PARTYLINK_CONFIG` 설정/모드 일관성, 네이버 버튼 정책, 완료 메시지 데모/라이브 구분.
8. Chromium / Mobile Chrome / WebKit 각각 테스트 수·PASS/FAIL/SKIP 실제 CI 로그; 브랜치 `82893c7` 검증 전 CI PASS 금지.

## D. PR 및 완료 게이트

- 이번 통합 브랜치에서 수정한 사항을 별도 **Draft PR → CI → 코드·테스트 검증 → Ready for review** 순서로 처리. 기존 PR #4/#5/#6을 별도 병합하면 중복 diff/충돌이 생길 수 있으니 **통합 PR과 중복되는 PR의 처리 전략**을 먼저 명시.
- 신규 UI 운영 배포는 본 PR과 기존 관련 PR을 정리하고 의도된 단일 결과가 main에 병합된 후 진행. 테스트 커밋 SHA와 Pages 배포 SHA를 비교.
- `README.md`, `SPECIFICATION.md`, `ELI10_REPORT.md`, `UI_UX_DECISION_RECORD.md`를 **실제 git diff에 포함**하고 현재 코드, 증거, 미완료를 일치시킨다. 문서 PR #7 내용은 충돌 없이 병합/이관.
- 관리자 비밀번호는 **프런트엔드 환경변수로 옮기는 것이 해결책이 아님**(정적 Pages에서는 노출됨). 서버 측 인증/권한·RLS로 보호.
- 실제 Supabase 프로젝트/Kakao 실제 로그인/API 배포는 운영 환경 검증 전 '미검증'으로 남기고 비밀키/실운영 데이터에 임의 접근·변경 금지.

## E. 판정

**부분 구현, 통합 완료 미인정.** 로컬 Chromium+Mobile Chrome '52/52'은 재현 가능한 워크플로와 commit 결합 증거 없음. 실서비스 화면 구현에 P0 결함이 남아 있고 미병합·미배포이므로 운영 전 QA 수정 필수.
