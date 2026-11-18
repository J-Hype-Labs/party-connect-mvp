# Part B 작업 인수 및 실행 기록

- 인수일: 2026-11-16
- 이전 세션: `3e7d8fa2-005a-433b-9762-400a59ddadd0` (무료 할당량 소진 후 종료)
- 실행 기준: 사용자의 해당 세션 인수 및 다수 ANUS Free Auto 병렬 위임 지시. `SPECIFICATION.md`, `docs/FEATURE_SPEC.md`, `docs/DECISIONS_NEEDED.md`의 Part B 범위.
- 브랜치: `6Soo`; 인수 HEAD `be0d044`.
- 원격 확인: `git fetch origin`, `git merge origin/main --no-edit` → Already up to date.
- 기존 사용자 파일: 미추적 `nul`, `pr-body.md` 보존.

## 현재 작업과 파일 소유권

| 요구사항 | 상태 | 담당 및 소유 파일 | 완료 근거 |
|---|---|---|---|
| F0-1 예시 쇼케이스 | 진행 중 | 데이터 `cd121357-252f-4060-832b-7a4526ca610e`: `js/party-data.js`, `js/party-showcase.js`; 화면 `3394630b-b7e6-4703-99db-2d54c2afeec6`: 두 사용자 HTML | 통합 후 0/3/6개 응답·오류·필터·비활성 행동 검사 예정 |
| F0-2 예시 정화 | 재검증 및 보완 중 | 데이터 담당: 위 JS, `assets/` | 이전 be0d044 존재. 가명·실제 파일·이미지 권리 근거 재검증 필요 |
| F0-3 신뢰 문구 | 진행 중 | 화면 담당: `index.html`, `party-connect/index.html` | 이전 완료 보고만으로 완료 인정하지 않음 |
| G-06 미션 조건 | 진행 중 | 화면 담당 | 상세 텍스트·누락 처리 검사 예정 |
| 회귀 검사 | 작성 중 | `674dbc43-236d-488d-b1ff-43540d9e18c1`: `tests/showcase.spec.js` 등 새 전용 테스트 | 감독자가 실행 및 검토 |
| L-01 약관 본문 | 자료 감사 중 | 테스트 담당 읽기 감사 | 운영 문안과 정책 확정 자료 확인 후 범위 결정 |
| L-03 사업자 표기 | 보류 | 사용자 제공 자료 대기 | 명세의 Q-12: 대표자·번호·주소 값 제공 전 시작하지 않음 |

모든 작업자는 실제 제공자 `anus`, 모델 `anus/free`로 생성했다. 공용 함수 계약은 `window.PartyShowcase.build(liveParties)`이며 예시는 `isExample=true`이다. 작성 파일은 분리하고 재귀 위임·작업자 commit/push/배포는 금지했다. 감독자가 결과를 통합한다.

## 실제 검사

- 데이터 담당 1차 결과 직접 검토: `build()`가 실제 파티의 시간·상태·미션 조건 등 미열거 필드를 유실하고, 예시 숫자 ID가 실제 ID와 충돌하며, 호출 간 예시 객체를 공유함을 확인했다. 해당 작업자에게 필드 보존·문자열 ID·반환값 격리와 회귀 검사 보완을 지시했다. 아직 완료로 인정하지 않는다.
- 로컬 JPG 3개는 `git ls-files assets`에 없고 이용 권리 근거도 없어, 기존 파일은 보존하되 새 자체 제작 SVG와 출처 기록으로 교체하도록 지시했다.
- 예시의 결혼 실적·방송 출연진 방문 등 검증 불가능한 주장도 중립적 설명으로 교체하도록 지시했다.

- 인수 기준 `npm run validate:jsx`: PASS.
- 인수 기준 `npm run validate:html`: PASS.
- 위 검사는 변경 전 기준선이며 새 구현 완료 근거가 아니다.
- 운영 DB·배포 변경 없음.

## 다음 실행

### 2026-11-16 후속 인수 대조

- 인수 감독자: `0c0974fa-c518-4af2-8f1f-a1ba9affd262`. 실제 대상은 동일 workspace `C:/AX/party-connect-mvp`, `6Soo`, HEAD `be0d044`.
- 기존 세 Anus Free Auto 세션을 재사용한다. 화면 작업자는 실행 중이므로 중복 작업자를 만들지 않았다. 데이터·테스트 작업자에게 각 소유 파일의 보완/복원만 지시했다.
- 데이터 작업자 활동 기록에서 소유 범위 밖 `index.html` checkout 및 `tests/showcase.spec.js` 삭제를 확인했다. 완료 보고의 '타 파일 미수정' 주장은 실제 활동과 충돌한다. 타인 파일 복원/삭제 금지 재고지 후 화면·테스트 담당자가 복구한다. 사용자 미추적 파일은 보존한다.
- 실제 `party-showcase.js`는 `exampleId`만 문자열이고 `id`는 숫자여서 충돌 수정이 남아 있다. `party-data.js`의 JPG 참조도 SVG로 교체해야 한다. 보고된 16개 PASS만으로 완료 처리하지 않는다.
- L-01: 운영 승인 약관/처리방침 본문·보관기간·책임자 자료 없음. L-03: Q-12 값 제공 보류 유지. 법률 문안을 임의 확정하지 않는다.
- 감독자 소유: `.github/workflows/ci.yml`에 쇼케이스 acceptance 실행 추가, 이 인수 기록, 통합 검사와 Git 반영.
- 다음 정확한 검사: `node node_modules/@playwright/test/cli.js test tests/showcase.spec.js --project=chromium --workers=2 --reporter=list`. 그 전에 작업자 결과와 `npm run validate:jsx`, `npm run validate:html` 확인. 로컬 정적 서버는 Python 3.14로 127.0.0.1:3000 시작.
- 직접 Node VM 검사 PASS: 0/3/6/7건 보충, 모든 실제 필드 보존, freeze된 원본 비변형, ID 유일성, 동일 JS 실행 문맥 내 예시 배열/필드 오염 격리, 참조 SVG 파일 존재.
- 화면 1차 완료 보고와 달리 직접 JSX 검사 FAIL(홈 잔존 후기 데이터, 탐색 Meta 주석 파손), ego-browser TaskSpace 27에서 빈 root 확인. 화면 담당자에게 실제 파일 기준 재수정 지시했다. 이 보고는 완료 증거가 아니다.
- 테스트 복원 discovery 24개 × 3브라우저=72개 확인. 리뷰에서 총 카드 수 1 기대, disabled 신청 버튼으로 예시 상세 열기, 로컬 호스팅 오인, reload로 격리 검사 등 잘못된 테스트를 발견해 담당자에게 보완 지시했다. discovery는 실행 PASS를 뜻하지 않는다.
- 원 사용자 이력(`paseo logs 3e7d8fa2-005a-433b-9762-400a59ddadd0 --tail 150 --json`) 확인: 명세 미구현 사항의 Paseo Anus Free Auto 위임과 감독 요청, 로컬/원격 동기화 승인. 현재 Part B P0 범위를 이어간다.
- 사용자 응답: L-01 자료 없음, 해당 항목 대기 유지(2026-11-16). 추가 질문 없이 보류 유지.
- 데이터/이미지 보완 완료 커밋 `1322248`: 직접 Node VM 계약 검사와 JSX/HTML 검사 PASS. UI 아직 미통합이므로 F0-1 전체 완료를 뜻하지 않는다. 기존 JPG 원본은 보존, 모든 파티 데이터 참조는 자체 SVG로 교체했다.
- 공용 파일 되돌림 재발로 기존 세 작업자를 취소했다. 실제 작성 격리가 필요해 Paseo worktree 두 개 생성: `wks_5770d1dcb4a38bad` (`C:/Users/kkokk/.paseo/worktrees/00lta81g/party-f0-ui-20261116`, 작업자 `cbf5746b-fab3-4a3f-a693-ff85c6b2a801`), `wks_7e7124d721470041` (`.../party-f0-tests-20261116`, 작업자 `a7b0b089-68d8-40f3-95dd-3cd922a40820`). 격리 브랜치는 결과 전달용이며 최종 변경은 기존 6Soo에 통합한다. 기존 사용자 workspace는 보존하고 임시 worktree는 결과 통합·검사 후 공식 archive한다.
- 격리 테스트 작업자 결과도 실제 코드 검토에서 반려했다(API mock 누락, 빈 목록 조건부 통과, 서로 모순되는 legacy 기대값). 해당 파일은 통합하지 않았다. 감독자가 테스트 검증 책임으로 실제 `loadLive` fixture 기반 `tests/showcase.spec.js`와 기존 탐색 회귀 기대값을 원본에 보완했다. 계약·정규화 2 tests PASS, 기존 `production-mode.spec.js` Chromium 4 PASS. 새 UI 전체 회귀는 아직 미실행.
- 감독자 통합 수정: `js/party-api.js` 정규화가 미션 조건을 유실함을 확인해 camel/snake 문자열 보존 추가. API normalization 회귀 PASS. `.github/workflows/ci.yml` 쇼케이스 검사 연결과 `scripts/validate-jsx.js` 신규 JS 구문검사도 다시 복구했다.
- 격리 Anus 화면 작업자도 반복적인 잘못된 판단만 하고 HTML 변경을 만들지 못해 취소했다. 정책의 검증 실패 대체 경로 적용: OpenCode 실제 모델 목록에서 승인된 Muse Spark/Space Bunny/Inkling Small 무료 ID가 없음을 확인했다. 같은 Codex 계정의 승인 후보 Luna medium으로 파일별 두 작업자 `/root/home_ui`와 `/root/discovery_ui`를 위 기존 worktree에 배정했다. 새로운 유료 계약/API/과금 없이 진행하며 감독자는 통합·검증을 유지한다.

1. 세 ANUS 완료 알림의 변경 내용과 실제 diff 검토.
2. 함수/화면 계약 통합, `npm run validate:jsx`, `npm run validate:html` 실행.
3. 테스트 서버 경로와 포트 확인 후 새 쇼케이스 테스트 및 영향받은 사용자 E2E 실행, 실패 원인 수정.
4. 검증 근거 및 남은 외부 자료 의존성을 이 기록에 갱신하고 승인된 Part B 흐름으로 커밋·원격 반영.

## 2026-11-16 최종 통합 검증 (현 세션)

이 절이 위의 진행 중 상태표와 다음 실행 목록을 대체한다. 실행 범위는 Part B P0이며 P1/P2를 새 과제로 시작하지 않는다.

| 요구사항 | 현재 상태 | 구현 및 실제 근거 |
|---|---|---|
| F0-1 | 구현·로컬 검증 완료 | 홈/탐색 모두 성공 응답 뒤 최소 6건 보충, 실제 우선, 필터별 실제/예시 수 분리, 예시 신청 비활성·찜 숨김. 0/3/6/7건 API 모의 응답 및 오류·로딩·상세 검사 통과 |
| F0-2 | 구현·로컬 검증 완료 | `1322248`의 가명·자체 SVG 및 이번 탐색 데모 상대경로 수정. ego-browser에서 데모 카드 8개 이미지 로드 확인 |
| F0-3 | 구현·로컬 검증 완료 | 가짜 후기/미확정 파트너 제거, 참여 5단계와 체험단·점주 모집 문구로 정리. 홈 acceptance 통과 |
| G-06 | 구현·로컬 검증 완료 | API camel/snake 미션 조건 보존, 두 상세 화면에서 줄바꿈 텍스트 표시 및 누락 시 숨김. HTML 주입 방지·실제 일정 보존 검사 통과 |
| L-01 | BLOCKED / 사용자 요청대로 자료 대기 | 운영 승인 본문, 확정 보관기간, 개인정보 보호책임자 성명·연락처 없음. 사용자에게 재질문하지 않음 |
| L-03 | BLOCKED / 기존 값 제공 대기 | Q-12 대표자·사업자번호·주소 미제공 |

검사 기록:
- JSX/공용 JavaScript 구문 검사와 HTML 구조 검사 PASS; `git diff --check` PASS.
- Chromium showcase 첫 실행 25/27 PASS. 홈 6건 검사는 카드 렌더 시간 초과로 실패했으나 단독 재검사 PASS. 탐색 로딩은 스켈레톤에 읽을 수 있는 상태 문구가 없어 실패했고 `role=status` 및 상태 텍스트로 수정했다.
- 관련 Chromium 재검사(두 페이지 6건·로딩·예시 상세/SVG) 6/6 PASS. 따라서 기존 27개 시나리오 모두 통과 근거가 있으며 첫 실행 실패를 숨기지 않는다.
- Chromium 기존 탐색·실제 신청/새로고침·로그인·로그아웃·운영 모드 보호 회귀 23/23 PASS.
- ego-browser 공간 28: 홈 안내 및 탐색 화면 직접 확인, 탐색 가로 넘침 없음, 데모 이미지 8개 로드 확인. 작업 후 공간 종료.
- 운영 DB 쓰기, 운영 배포, main 병합은 실행하지 않았다. 원격 동기화는 기존 승인대로 6Soo 브랜치에 반영한다.
- 모바일 주요 흐름 검사 결과와 최종 커밋/원격 URL은 아래 후속 기록에 남긴다.
- 임시 작업자 결과는 통합 검토 후 원본 변경을 stash로 보존했다. UI stash `a7ccf365e38bcd4366244b91344234ecb164c8fb`, 테스트 stash `ea7fe65fcc24f56fc315bec001294f48d9a6a003`. 두 worktree의 clean 상태를 확인한 뒤 Paseo 공식 archive 호출을 진행했다. 기존 사용자 workspace·`nul`·`pr-body.md`는 보존한다.
- 모바일 Chrome 주요 시나리오 8/8 PASS. 모바일 Safari 7/8 PASS 후 초기 렌더 10초 제한 실패 1건을 재검사 중이다. 실패 후 화면 기록에는 실제 0/예시 6개가 확인돼, 카드 최초 렌더 대기를 기존 탐색 회귀와 같은 30초로 맞췄다.
- 모바일 Safari 빈 응답 재검사(홈/탐색) 2/2 PASS. 모바일 16개 주요 시나리오 전체의 통과 근거 확보(최초 15 PASS + 실패 시나리오 재검사 PASS).
- 임시 UI workspace `wks_5770d1dcb4a38bad` 공식 archive 완료(`removedDirectory=true`); stash·브랜치로 복원 가능.
- 다음 외부 의존 항목은 L-01 운영 문안/보관기간/책임자 및 L-03 사업자 정보다. 그 전까지 법무 문구를 임의 확정하지 않는다.
- 최終 원격 검토: 초안 PR https://github.com/J-Hype-Labs/party-connect-mvp/pull/38, 구현 커밋 `4221d39`, origin/6Soo 일치 확인.
- 두 임시 workspace archive 후 활성 목록 제외, 디렉터리 부재 및 `git worktree list`에서 원본 하나만 남은 것을 직접 확인했다. 테스트 workspace archive 응답은 300초 시간 초과였으나 실제 정리는 완료됐다. stash 두 개는 유지한다.
- GitHub CI 첫 실행 `43736939809`: Validate & Lint PASS, comprehensive 36/39 PASS. 나머지 3개는 카드 제목의 신규 버튼과 기존 `button:has-text("혼술바")` 선택자 충돌로 실패했다. 필터의 정확한 accessible name을 사용하도록 수정했다. 제품 동작·기대 조건을 약화하지 않았다.
- CI에서 실패한 핵심 화면 검사 단독 로컬 재검사: Chromium/Mobile Chrome/Mobile Safari 3/3 PASS. 후속 커밋으로 CI를 다시 실행한다.

### 2026-11-16 CI 최종 확인 (인수 세션 `0d1de8d8`)

- 선택자 수정 커밋 `e911899`가 origin/6Soo에 반영됨을 확인했다(로컬 HEAD와 원격 일치, 작업 트리에는 기존 사용자 미추적 파일만 존재).
- GitHub CI 재실행 `43737484454`(head `e911899`): 완료, 결론 **success**. Validate & Lint SUCCESS, E2E Browser Tests(Chromium·Mobile Chrome·WebKit) SUCCESS. Deployment Readiness는 main push 전용이라 PR에서 SKIPPED.
- 이로써 F0-1·F0-2·F0-3·G-06 구현과 로컬·원격 CI 검증이 모두 완료됐다. 초안 PR #38 본문에 최종 CI 통과를 반영한다.
- 이 문서 갱신은 문서 전용 후속 커밋으로 반영하며, 해당 커밋의 CI 재실행 결과는 PR #38 본문과 최종 보고에 남긴다.
- 남은 항목: L-01(운영 승인 본문·확정 보관기간·개인정보 보호책임자 성명·연락처), L-03(Q-12 사업자 정보 값). 사용자 지시(2026-11-16)대로 자료 대기 유지, 재질문 없음. 법률 문구를 임의 확정하지 않는다.
- 다음 행동: 사용자의 PR #38 검토. 운영 DB 변경·운영 배포·main 병합은 실행하지 않는다.

## 2026-11-16 P1 웹 전용 구현 (현 세션, ANUS 병렬 위임 + 감독자 통합)

사용자 지시 "계속 anus free auto에 위임하여 구현"에 따라 Part B P1 중 웹 전용 항목을 Paseo ANUS Free Auto에 병렬 위임하고 감독자가 통합·검증했다. 서버 API가 필요한 S-02 제휴 신청·G-18 탈퇴 화면(Part A 선행)과 운영 DB 기록 위험이 있는 G-14 취소 실서버 검증은 범위에서 제외했다.

| 요구사항 | 현재 상태 | 구현 및 실제 근거 |
|---|---|---|
| G-08 파티 공유 링크 | 구현·검증 완료 | `js/party-share.js`(window.PartyShare). 실제 파티 상세에 공유 버튼, `?party=id` 딥링크로 상세 진입 후 URL 정리. 예시 파티는 공유 버튼 없음. 단위 22/22, 통합 6/6(3브라우저) |
| G-16 방문 QR | 구현·검증 완료 | `js/party-qr.js`(window.PartyQR, qrcode-generator MIT 내장, 네트워크 의존 없음). 마이페이지 승인+방문코드 신청에 emerald QR 렌더. 단위 17/17, 통합 4/4(3브라우저) |
| G-05 날짜 필터 | 구현·검증 완료 | `js/party-date-filter.js`(window.PartyDateFilter, KST 기준). 전체/이번 주/주말/날짜 지정 칩. 단위 44/44, 통합 2/2(3브라우저) |
| L-06 반응형 점검 | 구현·검증 완료 | 새 UI(날짜 칩·방문 QR) 320~1440px 가로 넘침 없음. `tests/p1-responsive.spec.js` 8/8(chromium) |
| L-01 약관 본문 | BLOCKED / 자료 대기 | 운영 승인 본문·확정 보관기간·개인정보 보호책임자 성명·연락처 없음. 재질문 없음 |
| L-03 사업자 표기 | BLOCKED / 값 제공 대기 | Q-12 대표자·사업자번호·주소 미제공 |

위임·통합 방식:
- 작업자 3명을 각각 격리 worktree에 배정해 새 파일만 작성하게 했다(공유 HTML 편집 금지). 감독자가 양쪽 HTML 배선·통합을 소유해 이전 세션의 공유 파일 충돌을 피했다.
  - 공유 `wks_c1decc32ce91ce28`(p1-share-20261116), 날짜 `wks_c1cdf4b96dcd62e5`(p1-datefilter-20261116), QR `wks_c01279ca657a5053`(p1-qr-20261116).
- 완료 보고를 그대로 신뢰하지 않고 실제 파일·테스트로 검증했다. QR 작업자 중간본에서 디버그 `console.log`와 vm 테스트 멈춤을 발견했으나, 최종본에서 제거됨을 확인한 뒤 통합했다.

검사 기록:
- `npm run validate:jsx`(신규 3모듈 포함 9개 JS + 양쪽 HTML), `npm run validate:html` PASS.
- 단위 테스트 메인 실행: 공유 22/22, 날짜 필터 44/44, QR 17/17 PASS.
- 신규 통합 `tests/p1-share.spec.js`·`p1-date-filter.spec.js`·`p1-qr.spec.js` 36/36 PASS(chromium·mobile-chrome·mobile-safari, workers=1).
- 신규 반응형 `tests/p1-responsive.spec.js` 8/8 PASS(chromium 320·1440px).
- 회귀: showcase·mypage-mission·mobile-layout·party-connect-page 65/65, comprehensive·user-journey·app·production-mode·oauth-error·admin 4종 77/77 PASS(chromium workers=1). 합계 142/142.
- 로컬 6워커 병렬 실행에서 단일 정적 서버 과부하(ECONNREFUSED)로 5건 실패했으나, CI와 동일한 workers=1에서 전부 통과함을 확인했다(코드 결함 아님). CI는 workers=1이다.
- `tests/helpers/live-fixture.js`에 딥링크용 `search` 옵션을 추가했다(기본 빈 문자열, 기존 호출 동작 불변).
- 운영 DB 쓰기·운영 배포·main 병합은 실행하지 않았다. 원격 동기화는 기존 승인대로 6Soo에만 반영한다.

## 2026-11-16 P2 병렬 구현 + 개발 단계 병합 정책 (현 세션)

사용자 지시 "모두 병렬로 진행 jacob 작업부분도 가능한것 모두"로 Part A 관리자 화면을 포함한 P2를 ANUS Free Auto에 병렬 위임하고 감독자가 통합·검증했다. 완료 보고를 그대로 신뢰하지 않고 실제 파일·테스트를 대조했다.

| 요구사항 | 현재 상태 | 구현 및 실제 근거 |
|---|---|---|
| F0-4 지역 표기 통일 | 구현·검증 완료 | 관리자 점포 지역을 게스트 필터와 같은 27개 목록 선택으로 통일(`js/admin-catalog.js`). admin-catalog 15 + enhance 8 통과 |
| F0-5 이미지·배지·미션 입력 | 구현·검증 완료 | 파티 등록에 이미지 URL·배지·추천·미션 조건 입력, 미션 기본값 협찬 표시 문구. missionRequirements 문자열 정규화 |
| F0-6 파티 복제 | 구현·검증 완료 | "복제" 버튼으로 원본 점포 미리 선택·새 일시 필수·DRAFT 상태 복제(클라이언트 id 미전송, 서버 부여) |
| M-04 일괄 선정 | 구현·검증 완료 | 다중 선택 일괄 선정, 성공/실패 건수 집계 토스트(`js/admin-app.js`). admin-app-enhance 13 + admin-page 17 통과 |
| M-11 연락처·문구 복사 | 구현·검증 완료 | 선정 신청에 연락처 복사·선정 안내 문구 복사(클립보드+폴백) |
| M-13 잔액 부족 사전 경고 | 구현·검증 완료 | 선정 시 점포 잔액·"약 n명분 선정 가능"/"잔액 부족" 표시(잔액 실제 조회된 경우에만, `admin-app.js:391-404`) |
| L-06 접근성 | 구현·검증 완료 | 모달 포커스 이동/복귀(useModalFocus), 터치 44px, 아이콘 aria-label, reduced-motion, 색상+텍스트 상태. p2-a11y 72 × 3브라우저 |
| G-17 프로필 기본값 | 구현·검증 완료 | 신청 시 이름·연락처 `partyconnect:profile` 저장·다음 신청 프리필(편집 가능). p2-profile 16 × 3브라우저 |
| L-01 약관 본문 | BLOCKED / 자료 대기 | 운영 승인 본문·보관기간·책임자 없음. 재질문 없음 |
| L-03 사업자 표기 | BLOCKED / 값 대기 | Q-12 값 미제공 |

감독자 검증·수정(예외):
- 워커 완료 보고와 달리 모달 포커스 관리가 실제 파일에 누락 → 감독자가 직접 구현·보완 후 통과 확인.
- 테스트 기대값 오류 다수 수정(날짜 형식 `11. 13.`, 전화번호 하이픈은 제출 시 정규화, 실서비스 모드 신청 내역은 서버 저장이라 localStorage 키 없음, 접근성 라벨 `파티 상세 모달 닫기`, WebKit 버튼 포커스 동작에 맞춘 키보드 활성화 검증, 모바일 로고 로케이터).
- party-connect 라이브 파티 제목을 항상 클릭 가능한 버튼으로 통일.
- 로컬 검증: 관리자 216 + P2 신규 264 + 사용자 회귀 333 통과(3브라우저). `validate:jsx/html` 통과.

통합·반영:
- 3커밋 `6Soo`: `02d5421`(카탈로그)·`5b863e1`(신청)·`cb20fb3`(접근성/프로필). 푸시 후 CI 43829697739 **success**(Validate & Lint + E2E 3브라우저 + Deployment Readiness).
- 워크스페이스 3곳(`wks_7f5482d75374ed54`·`wks_d1ec1e7c19f5e5eb`·`wks_de4c46a34ad25d9f`) archive 완료(`removedDirectory=true`). family 수신 기록(results-ack)에 검증 근거와 함께 기록.
- PR #38에 통합·검증 기록 댓글 게시(issuecomment-6911283901).

### 개발 단계 병합 정책 (2026-11-16 사용자 승인)

- 사용자 지시: "문서에 지금 홈페이지는 운영중이 아닌 개발단계이므로 검증 후에는 언제나 main 병합을 명시", "모두 승인".
- **정책: 홈페이지는 운영 중이 아닌 개발 단계이므로, 검증(CI 통과) 후에는 언제나 main으로 병합한다.** 별도 검토 대기로 병합을 보류하지 않는다. (운영 DB 쓰기·운영 배포·시크릿 변경은 여전히 Jacob 명시 승인 필요.)
- 적용: PR #38(6Soo→main)을 CI 통과 확인 후 squash 병합(`--delete-branch` 금지), 병합 후 `git merge origin/main`으로 6Soo 동기화. 명세 상태표(FEATURE_SPEC/SPECIFICATION) 갱신도 같은 정책으로 검증 후 병합.
- 여전히 대기: L-01 약관 본문·L-03 사업자 값(자료), G-14 실서버 취소 검증(운영 DB 위험·별도 승인), 서버 API 항목(partylink 저장소 부재).

### 병합 실행 완료 (2026-11-16)

- 문서 커밋 `5aab89f` CI 43888081726 **success**(Validate & Lint ✓, E2E 3브라우저 ✓ 10m41s, Deployment Readiness는 main-push 전용이라 PR에서 생략) 확인 후 병합 실행.
- PR #38 초안→준비 완료 전환(`gh pr ready 38`) → `gh pr merge 38 --squash`(**`--delete-branch` 미사용**, 6Soo 장기 브랜치 보존). main squash 커밋 `b345b50` "feat(web): Part B P0·P1·P2 구현 통합 + 개발 단계 main 병합 정책".
- 병합 후 `git fetch origin && git merge origin/main --no-edit` → 충돌 없음(ort), 6Soo 동기화 병합 커밋 `5f9b148`. `git push origin 6Soo` 완료, 로컬 HEAD=origin/6Soo=`5f9b148` 일치 확인. 강제 푸시·reset 없음.
- 운영 DB 쓰기·운영 배포·시크릿 변경은 실행하지 않음(여전히 Jacob 명시 승인 게이트). 보존 미추적 파일 `nul`·`pr-body.md`·`__pycache__` 미변경.

## 2026-11-17 나머지 기능 구현 — G-21·G-22 웹 측 (감독자 직접 구현)

사용자 지시 "l1 l3는 보류, 나머지 기능구현 완료할것". 명세 전수 대조 후 이 워크스페이스에서 구현 가능한 나머지 항목을 진행했다. L-01/L-03 보류 유지(재질문 없음). partylink 서버 저장소 부재를 C:\AX 전체에서 재확인 → 서버 의존 항목은 여전히 불가.

| 요구사항 | 현재 상태 | 구현 및 실제 근거 |
|---|---|---|
| G-21 사이트 내 알림 함 | 웹 측 구현·검증 완료 | `js/party-notify.js`(window.PartyNotify): 실제 신청 상태 변화에서 알림 도출 — 선정(APPROVED)·반려(REJECTED)·보완 요청(MISSION_SUBMITTED→VISITED)·체험 완료(COMPLETED). 최초 조회는 기록만, 사용자별 seen 상태 저장, 알림 함 새로고침 후 유지(읽기만 있던 기존 코드에 저장 보완). 홈·탐색 양쪽 배선. 단위 27 + 통합 17×3브라우저 |
| G-22 후기 작성 게이트 | 웹 측 구현·검증 완료 | COMPLETED(미션 최종 승인) 신청만 후기 작성: 상세 버튼 조건 `hasCompletedApplication` + 제출 시 방어. 홈 전용(탐색에 후기 기능 없음). 통합 17에 게이트 6건 포함 |
| G-20 서버 푸시·G-22 후기 DB·G-19 찜 동기화 | BLOCKED | partylink 서버 저장소 부재. 알림·후기 저장은 아직 localStorage |
| G-09 지도·S-03/S-04 점주 화면·M-12 관리 기록 | 보류 유지 | 제품 결정에 의한 P2 보류(카카오 JS 키·M5 결과·Q-14 선행) |
| G-14 취소 실서버 검증·G-04 실데이터·L-05 실서버 스모크 | BLOCKED | 운영 DB 위험·운영 자료·서버 필요 |
| S-02 제휴 폼·G-18 탈퇴·L-02/04/07·M-09 | BLOCKED | 서버 API/저장소 선행 필요 |

감독자 검증·수정(예외):
- 위임 대신 직접 구현: 두 항목이 공유 HTML 소규모 수정이라 병렬 위임 시 충돌 → 감독자 직접 구현(P1의 감독자 배선 소유 원칙과 동일).
- 검증 중 결함 3건 발견·수정: ① 서버 조회 전 빈 목록이 seen 상태를 덮어써 변화 감지가 불가하던 경합 ② 알림 미저장(기존 코드가 localStorage 키를 읽기만 하고 기록하지 않음) ③ loadSeen 배열 방어 누락 + 단위 테스트 VM 렐름 비교 오류.
- 로컬 서버 flake 진단(코드 결함 아님): `ECONNREFUSED ::1`(IPv6) → `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`으로 해결. IPv4에서도 200여 테스트 장기 런은 python 서버 열화 → 회귀를 소그룹으로 분리(invocation별 신선 서버). showcase 단독 27/27 통과 확인. 메모리에 저장.

검사 기록:
- 단위 27/27, `validate:jsx/html` 통과(검증기 목록에 party-notify.js 추가).
- 신규 통합 `tests/p2-review-notify.spec.js` 17×3브라우저 = 51/51.
- 회귀: Chromium 216(장기 런 214 + showcase 2건 단독 재실행 통과, showcase 단독 27/27)·Mobile Chrome 196·Mobile Safari 196 통과. p1 모듈 스위트는 Chromium 통과(해당 모듈 무변경).
- 운영 DB 쓰기·운영 배포·시크릿 변경 없음. 커밋 후 CI 통과 확인 → 개발 단계 정책대로 main squash 병합(`--delete-branch` 금지)·6Soo 동기화. 병합 실행 기록은 git 이력·최종 보고로 남기며 별도 문서 커밋을 만들지 않는다(재귀 방지).

## 2026-11-18 P1 확정 정책 안내 — Q-08·Q-16·Q-21 (감독자 직접 구현)

P1 질문 기한(2026-11-18) 도래·이견 없음 → 예시 답변 확정. 서버 변경 없이 웹에서 구현 가능한 안내 3건을 공용 모듈로 반영했다. L-01/L-03은 자료 대기 유지(재질문 없음).

| 요구사항 | 현재 상태 | 구현 및 실제 근거 |
|---|---|---|
| Q-08 선정 기준 공개 | 웹 구현·검증 완료 | `js/party-policy.js` `SELECTION_CRITERIA` 3단계를 홈·탐색 파티 상세에 표시. 예시 파티 제외 |
| Q-16 노쇼 30일 제한 안내 | 웹 구현·검증 완료 | `NOSHOW_NOTICE`를 파티 상세와 신청 폼(동의 체크박스 아래)에 표시 |
| Q-21 미션 검수 체크리스트 | 웹 구현·검증 완료 | 관리자 최종 승인 다이얼로그에 4항목 + 보완 최대 2회(`REVIEW_CHECKLIST`·`REVISION_LIMIT`) |
| Q-10·Q-11·Q-13·Q-17·Q-19·Q-22·Q-24·Q-27 | 답변 확정, 구현 대기 | 서버 규칙·운영 절차 선행(partylink 저장소 부재) |

검사 기록:
- 단위 `party-policy` 23/23, `party-notify` 27/27. `validate:jsx/html` PASS. `git diff --check` PASS(공백 경고만).
- 신규 통합 `tests/p1-policy.spec.js`·`tests/p1-admin-checklist.spec.js` 8×3브라우저 = 24/24.
- 반응형 `tests/p1-responsive.spec.js` 12/12(선정 기준 카드 320/1440px 넘침 없음 항목 추가).
- 회귀: 탐색 16/16, 관리자 30/30, 종합·여정 16/16, 모바일·알림·접근성 110/111 + 실패 1건 단독 ×2 재실행 24/24(flaky).
- 검증 환경 예외(코드 결함 아님): python `http.server` 장시간 실행 후 응답 열화로 실패 → 서버 재기동 후 전부 통과. showcase 실패 4건은 변경 stash(기준선)에서도 동일 실패. Playwright 1.64.1 대응 브라우저 빌드(1248/2370) 설치 필요.
- 커밋 `7145b98`(구현·문서)·`7c8b668`(CI에 P1 정책 스위트 추가) → PR #41. 운영 DB 쓰기·운영 배포·시크릿 변경 없음.

## 2026-11-19 P2 엑사원(K-EXAONE 2.5) 병렬 위임 — S-03·S-04·M-12

사용자 지시: "일부러 나중으로 미룬 것 엑사원에게 위임해서 진행". P2 보류 4개 항목을 격리 worktree 4개로 나눠 OpenCode 경유 `exaone/k-exaone_v2.5` 에 병렬 위임하고, 감독자가 통합·검증했다.

| 요구사항 | 결과 | 근거 |
|---|---|---|
| S-03 점주 로그인 골격 | 구현·검증 완료 | `owner/index.html`, `js/owner-api.js`, `docs/OWNER_API_CONTRACT.md`. `ownerApiEnabled` 기본 false → 네트워크 요청 0(fail-closed). 통합 9/9 |
| S-04 점주 방문 인증 골격 | 구현·검증 완료 | `owner/visit.html`, `js/owner-visit.js`, `docs/OWNER_VISIT_API_CONTRACT.md`. 코드 정규화·형식 검증·transport seam. 카메라/QR 스캔 범위 제외. 통합 9/9 |
| M-12 관리 행위 기록 | 구현·검증 완료 | `js/admin-audit.js`, `admin-app.js` 카드에 `처리: 이름 시각`, `docs/ADMIN_AUDIT_API_CONTRACT.md`. 감사 조회 기본 꺼짐. 통합 7/7 + 기존 관리자 30/30 |
| G-09 지도 탐색 | **분리(미완)** | `js/party-map.js`·단위 41/41 은 완성했으나 화면에서 마커 미생성. 병합 커밋 revert, 시도는 `backup/map-attempt`(`e78e399`)에 보존 |

감독자 검증에서 발견·수정한 결함:
- S-03: JSX `class=` 57곳(React `className` 필요)·삼항 두 노드(프래그먼트 누락)·`loadParties` 에서 `setView('app')` 누락·테스트 헬퍼 `ownerCalls` 구조 불일치·async 비교 누락·상태 셀 strict 중복.
- S-04: `React.createElement` 괄호 불균형(파싱 실패)·`normalizeCode` 접두사 규칙·테스트 transport 결과 순서·configure 이벤트 반영 대기 누락.
- M-12: `KST` 형식이 Intl 표기(`11. 20.`)와 달라 계약(`M/D HH:MM`)으로 조립, `.audit-line` 클래스 누락, 테스트 기대값 모순 1건.
- G-09: `Object.create(null)` 인덱스 falsy 버그(`index[addr] === undefined`), `const kakao` 재할당, `kakao.Map` vs `kakao.maps.Map` 검사, React 렌더 순서(호스트 DOM 존재 시점) — 마지막 항목 미해결.

위임 중 권한 처리: 존재하지 않는 경로(`C:\home\user\...`) 6건·`AWS_*` 환경변수 나열 1건·SDK 재설치 1건 거부, Temp 로그 쓰기 2건 허용. G-09 에이전트는 3시간 반복 재작성으로 진전 없어 취소.

검사 기록:
- 단위 `party-policy` 23/23, `party-notify` 27/27, `party-map` 41/41(분리 전)
- 통합 `owner-page` 9/9, `owner-visit` 9/9, `admin-audit` 7/7, `p1-policy` 6/6 → 31/31
- 회귀 기존 관리자 30/30, P1 정책 36/36, `validate:jsx`·`validate:html` PASS
- 운영 DB 쓰기·운영 배포·시크릿 변경 없음. 기능 기본값 false 라 실제 동작 변화 없음.
- PR #42 생성(`p2/policy-guidance-integration`), CI 에 P2 스위트 추가.

**교훈:** 엑사원은 계약·문서 작성은 잘하나(세 계약 문서 모두 유용), 대형 단일 HTML 의 JSX/괄호 구조 완성은 신뢰할 수 없다(3건 모두 파싱 실패 또는 결함). 위임 시 "신규 모듈+테스트"는 맡기고 화면 배선은 감독자가 하는 것이 이 저장소의 기존 원칙과 일치한다.
