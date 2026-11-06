# PartyLink 프런트엔드 P0 통합 감사 / 상태판

> **최신 추가 점검(2026-11-07 02:14 KST):** [통합 커밋 `82893c7` 검토](./P0_QA_REVIEW_82893C7.md). 원격 브랜치 `fix/p0-integration-qa`는 존재하지만 해당 커밋 CI·PR 미확인. 라이브 모드 `setParties` 미정의/목록 정적 유지 등 P0 결함 발견. 아래 초기 상태표는 **00:43 당시 스냅샷**이며 최신 추가 감사와 충돌하는 경우 최신 문서 우선.


> 점검: 2026-11-07 00:43 KST (GitHub 실조회). 이 문서는 **PR #4의 기존 ELI10_REPORT.md 중 검증되지 않은 완료 주장보다 우선하는 감사 결과**다. PR 병합/CI 완료 뒤 상태를 다시 갱신하라.
> 기준: `main=6b56560d29ea8b76774427239a70df66a526ebda`, PR #4 head `129873a43ad28ba9f50d67a301107d2582076e54`.
> 표기: **검증됨**(실행/증거), **코드 존재**(정적 확인, 미검증), **차단/미검증**.

## 1. 단일 사실원천: PR 현황

| 구역 | PR | 검토 당시 상태 | 의도와 실제 |
| --- | --- | --- | --- |
| P0 AUTH 명세 | [웹 #3](https://github.com/J-Hype-Labs/party-connect-mvp/pull/3) | OPEN | 문서. `#3` 자체는 OAuth 구현이 아니다. |
| P0 UI 구현 | [웹 #4](https://github.com/J-Hype-Labs/party-connect-mvp/pull/4) | OPEN, 10개 파일 | 최초 문서 전용이었지만 현재 `party-connect/index.html`, `js/party-data.js`, E2E 및 UI 보고서까지 포함. **PR 본문이 아직 '문서 전용'이라 부정확**. |
| 카카오/DB 프런트 | [웹 #5](https://github.com/J-Hype-Labs/party-connect-mvp/pull/5) | OPEN | 별도 `index.html`의 OAuth/Edge Function 구현. 설정 URL/anon 키가 비어 운영 데모 모드. 실제 카카오/Supabase 운영 검증 없음. |
| 사용자 흐름 QA | [웹 #6](https://github.com/J-Hype-Labs/party-connect-mvp/pull/6) | DRAFT/OPEN | `tests/user-journey-regression.spec.js`; 해당 테스트 파일은 현재 기본 CI 명령 실행 대상이 아님. |
| PartyLink 백엔드 | [서버 #1](https://github.com/J-Hype-Labs/partylink/pull/1) | OPEN | SQL 마이그레이션/Edge Function; 운영 프로젝트 적용, 진짜 카카오 로그인 미검증. |
| 배포 | `main` | 기존 버전 | `main` 배포 성공 SHA `6b56560`만 확인. 신규 UI 주소의 Pages 배포 증거 없음. |

PR #4 CI: [Run 42245297056](https://github.com/J-Hype-Labs/party-connect-mvp/actions/runs/42245297056) (점검 당시 `in_progress`; Validate & Lint PASS, E2E 진행 중). **최종 결과를 확인하기 전 PASS로 전환하지 말 것.**

## 2. 발견된 구조적 문제 (코드 확인)

1. **두 갈래 인증**: PR #4 `party-connect/index.html`의 `handleSocialLogin`은 `user_${Date.now()}`를 생성하는 **mock 로그인**. `openMyPage`는 '준비 중' 토스트. PR #5 `index.html`의 Supabase Auth/PKCE/Edge Function과 통합돼 있지 않음. '카카오 로그인 보존' 완료 판정 금지.
2. **데이터의 이중 소스**: 새 페이지는 `../js/party-data.js`의 하드코딩 `PARTY_LIST`로 검색/필터; 메인 페이지는 자체 파티 초기 데이터/localStorage 또는 PR #5 API. `party-data.js`를 불러온다는 사실만으로 **메인과 운영 DB 간 실시간 공유가 성립하지 않는다**. ID, 모집 정원, 신청 상태, 지역/요일 규격을 명시적 어댑터로 맞출 것.
3. **로컬 신청**: 새 페이지 `submitApplication`은 로컬 상태·`partyconnect:applications`에 저장 후 데모 완료를 알림. 실제 OAuth/서버 접수 없이 운영 신청 완료로 취급 금지. 원본 신청 데이터 훼손 금지.
4. **테스트 회피**: PR #4 `tests/party-connect-page.spec.js` 상세 클릭에 `click({force:true})`, 닫기에 강제 클릭을 사용하며 검색/요일은 존재 또는 카드 수 양수만 확인. 조합 필터 정확성, 신청 폼, 재접속, 실제 에러 및 모달 접근성을 증명하지 못한다. `comprehensive.spec.js` 역시 force click으로 변경됨.
5. **CI 범위**: `test:e2e:full`은 `tests/comprehensive.spec.js`만 실행. PR #4 워크플로에 전용페이지 E2E가 **별도 단계로 추가됐으나**, `tests/user-journey-regression.spec.js`는 여전히 빠져 있고 PR 통합 전까지 단일 게이트가 아님. 브라우저별 PASS/FAIL/SKIP을 분리해야 함.
6. **접근성/구조**: 홈 메뉴에 `aria-current="page"` 고정 적용은 홈 경로에서 부정확. 전용 페이지 카드의 `article role="button"` 안에 찜 버튼/신청 버튼을 중첩해 버튼 안 버튼과 유사한 접근성·이벤트 충돌 위험. 카드 클릭 영역과 보조 버튼을 분리.
7. **신뢰 근거 부족**: `ELI10_REPORT.md`는 스크린샷이 실제 존재하지 않는다고 명시하면서 RWD/A11Y/CI/Pages 동일 SHA 검증 등을 PASS·최종 COMPLETE로 기재. 최근 PR #4 CI 실행은 진행 중. 검증 증빙 없이 '수동 정상', '플래키' 확정 금지.
8. **운영 콘텐츠 주의**: 새 `PARTY_LIST`에는 '결혼 확정' 등 마케팅 문구, 고정 모집인원/NEW 배지, 외부 사진 URL이 포함돼 있다. 실제 확인된 데이터인지 검토하고, 아니라면 **데모 전용 표시**. `partner@partyconnect.kr`가 실제 운영 주소인지 소유 확인 전 노출하지 말 것.
9. **경로 검증**: 로컬 E2E의 `/party-connect/`는 GitHub Pages 실제 프로젝트 경로 `/party-connect-mvp/party-connect/`와 다름. 직접 열기/새로고침/뒤로가기 및 리소스 상대경로를 **배포 주소**에서 별도 검증.
10. **모바일 메뉴**: PR #4 헤더는 `md:flex` 데스크톱 nav를 감춤. 로고의 홈 이동은 모바일에서 **파티커넥트 전용 페이지로 진입하는 경로가 아님**. 모바일 홈의 명시적 진입 경로 실검증 필요.

## 3. 최신 합의 및 작업 순서

- 단일 파티 탐색 진입점: '파티커넥트'; '체험단'/'러브커넥트 HOT' 독립 메뉴 제거. 내부 역사적 DB 명칭은 삭제하지 않음.
- 신청 CTA: '파티 신청하기', 이미 신청: '신청 완료', 마감: '모집 마감'. 실제 운영 신청과 데모는 사용자에게 분명히 구분.
- 병렬 분업: PR #4 UI / PR #5 인증·신청 / partylink #1 DB·Edge Function / PR #6 회귀 QA. **무단 병합/재작성/운영 DB 변경 금지**.
- 우선순위: **G0 최신 브랜치·PR·CI 재조회 → G1 #4 모달·모바일·필터 테스트 실제 수정 → G2 #5 인증/API 데이터 통합 → G3 #6 실제 사용자 흐름을 CI 게이트에 포함 → G4 3브라우저·반응형·운영 배포 검증 → G5 보고 문서 상태 정정**.
- 아키텍처: 가능한 최소 변경으로 단일 인증/파티 데이터/신청 상태 경로를 만들어 홈과 전용 화면이 **서로 다른 사실을 보여주지 않게** 함. 최초에는 데모/실서비스 분기를 명시하고 기존 로컬 데이터 마이그레이션 여부를 별도 검토.
- 보안: 서비스 키·Client Secret 브라우저 저장 금지, 백엔드의 JWT/RLS/데이터 검증 유지, 관리자 인증 하드코딩을 실운영 접근경로에 남기지 말 것.
- 정책·사업 판단(업체 비용, 개인정보 동의 문구, 실제 리뷰/혜택)은 독단 확정하지 말고 미결로 명시.

## 4. 증거가 있는 종료 조건 (필수)

- [ ] PR #4와 #5 코드 충돌 분석 및 통합 결과(파일/핸들러/데이터 경로) 기록.
- [ ] PC/모바일 모두 새 파티 전용 페이지로 이동, `aria-current` 경로별 정확.
- [ ] 운영과 데모 분리, mock 실운영 로그인 금지, 신청/마이페이지/로그아웃 기능 보존.
- [ ] 실제 카드 클릭 → 맞는 상세 모달 → 유효/무효 신청 → 완료 → 새로고침/중복방지까지 **force 없이** 테스트.
- [ ] 검색(제목·업체·지역) + 요일 + 지역 + 복합 AND + 0건의 결과/카드 수를 **정해진 fixture 기대값**과 비교.
- [ ] 첫 진입, URL 직접 진입, 새로고침, 뒤로가기, 콘솔·JS 오류, 이미지 실패, 모달 ESC/포커스/스크롤 확인.
- [ ] 320/375/390/768/1280/1440px, Chromium·Mobile Chrome·WebKit 실제 검증, PASS/FAIL/SKIP 표.
- [ ] `npm run test:e2e:full` 또는 명시된 CI 게이트가 comprehensive + party-connect-page + user-journey-regression 전부 실행 (관련 PR 브랜치 통합 후).
- [ ] GitHub Actions **실제 실행 ID**와 검증 SHA, Pages 배포 SHA/URL 증빙.
- [ ] `ELI10_REPORT.md`와 PR #4 설명의 과장·구식 '문서 전용'·'완료' 주장을 현재 증거에 맞게 수정.
- [ ] 사용자 승인 없는 main 직접 푸시/운영 데이터 변경 없음.

> 최종 판정: **부분 구현 / 통합·실동작 검증 미완료**. 이 문서는 상태 점검 결과이고 새 코드의 자동 테스트를 실행했다는 뜻은 아님.

## 5. 담당자 안내

후속 실행 지시: [NEXT_AGENT_IMPLEMENTATION.md](./NEXT_AGENT_IMPLEMENTATION.md). 검토 후 이 문서를 매 PR/CI 변화에 맞춰 최신화하고, 증거 없는 PASS는 항상 `미검증`으로 남긴다.
