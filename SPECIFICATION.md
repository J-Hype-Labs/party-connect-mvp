# HypeConnect 통합 개발 명세 (v2.0)

- 기준일: 2026-11-10
- 기준 main: 웹 `party-connect-mvp` 58a435e, 서버 `partylink` ffc8b65
- 이 문서가 **제품·기술·업무 분담의 단일 기준**이다. 다른 문서와 내용이 다르면 이 문서를 고치고 다른 문서를 맞춘다.
- 상세 참조 문서는 [11장](#11-문서-지도)에 있다. 상세 문서의 "현재 상태" 표는 작성 시점 기록이며, 현재 상태는 이 문서의 4장이 기준이다.

## 1. 제품

HypeConnect는 혼술바·소셜링 파티 점주와 체험단 게스트를 연결한다. 게스트는 파티를 찾아 신청하고, 선정되면 방문해 리뷰 미션을 제출한다. 미션이 최종 승인되면 점주의 **선불 적립금에서 인당 수수료(기본 1만 원)**가 차감된다.

### 이번 단계 목표 (Notion MILESTONE, 2026-11-04 ~ 11-27)

| 단계 | 기간 | 목표 |
|---|---|---|
| M1 사업 구조 확정 | 11/4~6 | BM·법률·운영 정책 |
| M2 시장·업체 검증 | 11/7~10 | 제휴 후보 5곳 이상 |
| **M3 MVP 구축** | 11/11~15 | 실제 신청을 받을 수 있는 웹 |
| M4 업체·체험단 확보 | 11/16~19 | 제휴 5곳, 체험 상품 10개, 신청 20건 |
| M5 실거래 검증 | 11/20~24 | 유효 방문 20건, 수수료 실제 입금 1건 이상 |
| M6 평가·출시 결정 | 11/25~27 | GO / IMPROVE / STOP |

판단 원칙: **개발 완성보다 11/24까지 실제 수익 발생 과정을 확인하는 것이 우선**이다. 범위를 늘리는 기능은 이 목표에 직접 기여할 때만 넣는다.

### 운영 원칙 (변경 금지)

- 방문 실적은 자체 **방문 코드/QR**로 검증한다. 허위 영수증을 이용하는 리뷰 방식은 쓰지 않는다.
- 초기 정산은 **수동**(관리자가 입금 확인 후 충전, 최종 승인 시 자동 차감)으로 한다. 자동 청구는 만들지 않는다.
- 회원 인증을 위해 생년월일·나이·연령 확인 자료를 수집하지 않는다. 성인·신분증 확인은 파티 현장 운영자의 책임이다.
- 카카오 로그인만 제공한다(네이버 로그인 재추가 금지).

## 2. 사용자와 권한

| 유형 | 할 수 있는 일 | 식별 |
|---|---|---|
| 비로그인 방문자 | 공개 파티 목록·상세 탐색 | — |
| 게스트(회원) | 신청, 본인 신청 조회·취소, 미션 제출 | 카카오 로그인 토큰 → `auth.users.id` |
| 관리자 | 점포·파티·신청·적립금·게스트 운영 | 로그인 토큰 + `admins` 테이블 등록 |
| 점주 | (MVP 범위 밖) 선정·방문 인증·승인은 관리자가 대행 | — |

- 로그인 여부와 역할은 별개다. 카카오 로그인만으로 관리자 권한을 주지 않는다.
- 클라이언트가 보낸 `user_id`·`guest_id`·`store_id`로 권한을 판단하지 않는다. 서버가 토큰과 DB에서 조회한다.

## 3. 시스템 구성

```
[웹: GitHub Pages]  ──supabase-js(카카오 PKCE)──▶  [Supabase Auth]
  party-connect-mvp       │ publishable key + 로그인 토큰
                          ▼
              [Edge Function partylink-api]  ──service_role──▶  [Postgres: 업무 함수 / RLS]
                 /parties /applications /admin/*
                 저장소: partylink
```

| 구분 | 위치 |
|---|---|
| 운영 사이트 | `https://j-hype-labs.github.io/party-connect-mvp/` |
| 파티 탐색 페이지 | `…/party-connect/` |
| 관리자 화면 | `…/admin/` |
| Supabase 프로젝트 | `Partylink01` (ref `cpctedhhojmbycnqhzli`). 같은 계정의 소문자 `partylink01`은 쓰지 않는다 |
| 웹 기술 | React 18 UMD + Babel Standalone(빌드 없음), Tailwind CDN, Pretendard |
| 서버 기술 | Supabase Edge Function(Deno), PostgreSQL 업무 함수 + RLS |
| CI | 웹: GitHub Actions(JSX/HTML 검증 + Playwright E2E 3개 브라우저). 서버: CI 없음, 로컬 Deno 테스트 |

보안 규칙:
- 브라우저에는 publishable key만 둔다. `service_role`·Kakao Client Secret·관리자 비밀번호는 브라우저와 저장소에 두지 않는다.
- CORS 허용 출처는 `ALLOWED_ORIGINS=https://j-hype-labs.github.io`만 둔다(2026-11-10 정리 완료).
- 사용자 입력은 화면에 `textContent`로만 그린다(`innerHTML` 금지). 링크는 `http(s)`만 허용하고 `noopener`를 붙인다.
- 키·토큰은 코드와 로그에 남기지 않는다.

## 4. 현재 상태 (2026-11-10)

### 완료

| 영역 | 상태 |
|---|---|
| DB | 스키마 v2 + 마이그레이션 `20261106`(웹 연동), `20261107`(admins), `20261110`(미션 보완 요청) 운영 적용 |
| 서버 | `partylink-api` **v8** 배포. 사용자 API + 관리자 API. 파티 상태 전이·정원 서버 검증, 상황별 오류 메시지 |
| 로그인 | 카카오(Supabase Auth, PKCE). Kakao 비즈 앱, 동의항목 닉네임 필수·사진/이메일 선택 |
| 사용자 웹 | 실서비스 모드. 파티 목록·필터·상세·신청, 마이페이지(신청 상태, 미션 제출·재제출, 보완 요청 안내), 카드에 업체명·주소, 320/768px 레이아웃 테스트 |
| 관리자 화면 | 로그인 가드, 대시보드, 신청 관리(선정·반려·방문 인증·노쇼·최종 승인·보완 요청), 파티, 점포·적립금(충전·환불·내역·수수료 집계), 게스트 차단 |
| 이름 변경 | 화면 표시 이름 HypeConnect, 텍스트 로고 `assets/hypeconnect-logo.svg`·아이콘, 파트너 메일 `partner@jhypelabs.com` |
| 보안 정리 | 메인 페이지의 데모 관리자 모달·하드코딩 비밀번호 제거, `ALLOWED_ORIGINS`에서 localhost 제거 |
| CI | 웹 `main`의 E2E(chromium, mobile-chrome, WebKit)와 관리자 테스트 통과 |

### 아직 검증되지 않음

- **카카오 로그인 실서버 전체 흐름**(신청 → 선정 → 방문 인증 → 미션 → 보완 요청 → 재제출 → 최종 승인 → 적립금 차감). 자동 테스트는 서버를 mock 한다. 절차: `docs/manual-e2e-checklist.md`.
- 운영 DB에 점포·파티가 0개라 사이트에는 "검색 결과가 없습니다"가 보인다.

### 알려진 차이 (구현 필요)

| 항목 | 내용 | 담당 |
|---|---|---|
| 가입 동의 API | 웹 `js/party-api.js`가 `GET /me`, `POST /me/onboarding`을 호출하지만 서버에 라우트가 없다(404). 동의 버전·시각 저장 테이블도 없다 | A(서버) → B(화면 연결) |
| OAuth 복귀 경로 | `auth-service.js`의 `redirectTo`가 현재 페이지 URL이다. `auth/callback/` 사용 여부를 실서버 흐름에서 확정해야 한다 | B |
| 요일 필터 | 화면은 반복 요일(`days`) 기준이지만 DB 파티는 1회성 일시다 | B(정책은 PM) |
| 파티 상태 자동 전환 | 모집 마감 → `CLOSED`, 종료 → `FINISHED` 정기 작업이 없다 | A |
| 데모 모드 우회 | 운영 사이트에서 `?demo=1`이 실서비스 모드를 끌 수 있다 | B |
| 관리자 헤더 로고 | 관리자 화면은 이름만 바뀌었고 로고는 아직 없다 | A |

## 5. 핵심 도메인 규칙

### 신청 상태

```
APPLIED ─선정─▶ APPROVED ─방문 인증─▶ VISITED ─미션 제출─▶ MISSION_SUBMITTED ─최종 승인─▶ COMPLETED
   │                ├─노쇼─▶ NOSHOW                                └─보완 요청─▶ VISITED
   └─반려─▶ REJECTED └─취소─▶ CANCELLED (APPLIED에서도 취소 가능)
```

- 정의되지 않은 전이와 `complete_application()` 밖에서 `COMPLETED`로 바꾸는 것은 DB 트리거가 막는다.
- `APPLIED`는 "신청 접수"다. 선정·참가 확정으로 안내하지 않는다.
- 보완 요청은 사유를 저장하지 않는다(MVP 결정). 화면은 `status==='VISITED' && missionUrl`이면 "보완 요청됨"으로 표시한다.

### 시간·정원

- 신청은 모집 마감 전에만 가능하다. 방문 인증은 **파티 시작 60분 전 ~ 종료 시각**에만 가능하다.
- 정원은 선정 인원(APPROVED 이상)보다 줄일 수 없다. 취소·종료된 파티는 다시 모집 중으로 되돌릴 수 없다.

### 적립금

- 수수료는 선정 시점에 `applications.fee_amount`로 고정된다.
- 최종 승인은 잔액 검증 + 차감 + 원장 기록을 한 트랜잭션으로 한다. 신청당 차감은 1건만 허용된다(유니크 인덱스).
- 원장 `deposit_histories`는 수정·삭제할 수 없다.
- 노쇼는 벌점을 쌓고 기준을 넘으면 30일 자동 차단된다. 관리자 수동 차단은 기간이 없다.

### API

API 계약 원본은 `partylink/docs/party-connect-integration.md`다. 요약:

| 구분 | 경로 |
|---|---|
| 공개 | `GET /parties` |
| 게스트(로그인) | `GET/POST /applications`, `POST /applications/:id/cancel`, `POST /applications/:id/mission` |
| 관리자 | `GET /admin/me`, `GET /admin/summary`, `/admin/stores*`, `/admin/parties*`, `/admin/applications*`, `/admin/guests*` |

오류 코드: `PL400` 입력 오류, `PL402` 잔액 부족, `PL403` 권한 없음, `PL404` 대상 없음, `PL409` 상태 전이 불가·중복, `PL410` 마감·정원 초과·시간대 밖, `PL423` 차단.

## 6. 화면 기준

- 반응형 검증 폭: 320, 375, 390, 768, 1280, 1440px. 모바일 1열, 중간 2열, 데스크톱 3열. 가로 스크롤 금지.
- 터치 영역 44×44px 이상, 아이콘 버튼 접근성 이름, 모달 포커스 이동·복귀, ESC 닫기, `prefers-reduced-motion`, 색상만으로 상태를 전달하지 않는다.
- 브랜드 토큰: Primary `#E11D48`, Secondary `#FB7185`, Accent `#F59E0B`, Text `#18181B`, Muted `#71717A`, Border `#E4E4E7`, 글꼴 Pretendard.
- 신청 성공은 서버 응답 후에만 표시한다. API 오류와 빈 목록을 구분한다. 운영 환경에서 빈 응답을 데모 데이터로 대체하지 않는다.
- localStorage 키(`partyconnect:*`)는 기존 사용자 데이터 보존을 위해 이름을 바꾸지 않는다.
- 저장소 이름과 Pages 경로 `/party-connect-mvp/`는 바꾸지 않는다(카카오·Supabase Redirect 주소가 깨진다).

## 7. 업무 분담: 두 파트

한 영역에는 한 담당만 둔다. 다른 파트의 파일을 고쳐야 하면 먼저 상대에게 요청하고, 같은 파일을 동시에 고치지 않는다.

| | **Part A: 서버·운영(관리자)** | **Part B: 사용자 웹** |
|---|---|---|
| 담당(제안) | Jacob (`hustlinjh`) | 동료 (`6Soo`) |
| 저장소·파일 | `partylink` 전체(`supabase/**`, `docs/**`)<br>웹 `admin/**`, `js/admin-*.js`, `tests/admin-*.spec.js`, `docs/admin-page.md`, `docs/manual-e2e-checklist.md` | 웹 `index.html`, `party-connect/**`, `auth/**`, `js/auth-*.js`, `js/party-*.js`, `js/mission-ui.js`, `assets/**`, 사용자 테스트(`tests/comprehensive`, `party-connect-page`, `user-journey-regression`, `mypage-mission`, `mobile-layout`), `docs/AUTH_*.md`, `docs/MAP_EXPLORATION_DESIGN.md` |
| 공동(PR로 상대에게 알림) | `SPECIFICATION.md`(이 문서), `.github/workflows/ci.yml`, `package.json`, `playwright.config.js`, `tests/helpers/**`, `README.md` | 같음 |
| 브랜치 접두어 | `a/…` (예: `a/me-onboarding-api`) | `6Soo` (고정 장기 브랜치) |

담당은 제안이다. 바꾸려면 이 표만 고치면 된다.

### Part A 작업 목록

| ID | 작업 | 완료 기준 | 시점 |
|---|---|---|---|
| A1 | **실서버 전체 흐름 검증 지원**: 체크리스트대로 진행할 때 서버 로그·DB 쿼리로 원인 확인 | 체크리스트 1~7단계 통과 기록 | M3(11/15) |
| A2 | **가입 동의 API**: `GET /me`(프로필·동의 여부), `POST /me/onboarding`(약관 버전·동의 시각·마케팅 동의 저장) + 테이블 마이그레이션 + Deno 테스트 + API 표 갱신 | B가 호출해 저장·조회 확인, 404 해소 | M3 |
| A3 | **파티 상태 자동 전환**: 모집 마감 지나면 `CLOSED`, 종료 지나면 `FINISHED`(pg_cron 또는 예약 함수). 신청 중인 건은 건드리지 않는다 | 시간 경과 후 목록에서 마감 파티 미노출 | M4(11/16) 전 |
| A4 | **관리자 운영 보강**: 관리자 헤더에 HypeConnect 로고, 정산 내역 CSV 내보내기(수동 정산·입금 대조용) | 화면 확인, 원장과 일치 | M4~M5 |
| A5 | **실거래 대비 운영 점검**: `docs/settlement-check.md` SQL로 일일 정산 대조 절차 확정, 수수료 집계 500건 초과 시 서버 집계 엔드포인트 | M5 기간 일일 대조 | M5 |
| A6 | 레거시 `SUPABASE_SERVICE_ROLE_KEY` → 새 시크릿 키 이전 | 재배포 후 정상 | 2027년 초 전 |

### Part B(6Soo) 브랜치 운영 규칙

- Part B(6Soo)는 앞으로 `6Soo` 브랜치 하나에서 계속 개발한다. 작업별 `b/…` 브랜치는 만들지 않는다.
- 작업 시작 전 `git fetch` 후 `git switch 6Soo; git merge origin/main`으로 동기화한다(공유 브랜치 rebase 금지).
- PR은 `6Soo` → `main`으로 올린다. 병합 시 브랜치 삭제 옵션을 쓰지 않는다(`gh pr merge --squash`에 `--delete-branch` 금지).
- squash 병합 후에는 `git fetch; git switch 6Soo; git merge origin/main`으로 main을 6Soo에 합쳐 이어 간다(같은 변경이라 보통 충돌 없이 합쳐지고, 다음 PR에는 새 변경만 나타난다). 강제 push와 `reset --hard`는 쓰지 않는다.
- 에이전트에게 Part B 작업을 맡길 때 이 브랜치 규칙을 그대로 전달한다.

### 2026-11-11 현재 6Soo 브랜치 진행 상태

| 작업 | 상태 | 남은 실검증 |
|---|---|---|
| B2 가입 동의 화면 연결 | 프런트 구현 완료 | A2 배포 후 실서버 확인 |
| B3 OAuth 복귀 경로 확정 | 프런트 구현 완료 | Supabase·카카오 Redirect에 `/party-connect-mvp/auth/callback/` 등록 확인 — Jacob |
| B4 운영 모드 고정 | 프런트 구현 완료 | 운영 주소 화면 확인 |
| B5 요일 필터 정리(대안 A) | 프런트 구현 완료 | 실DB 확인 |
| B6 메타 태그(og-image 등) | 프런트 구현 완료 | 배포 후 카카오 미리보기·320~1440px 수동 점검 |
| B1 실서버 전체 흐름 검증 | — | 실제 카카오 계정 필요 |
| B7 지도 탐색 | 보류 | — |

> 검증: `validate:jsx/html` 통과, Playwright E2E(chromium 회귀 55 passed)

### Part A 요청

- `js/admin-app.js` 로그인 `redirectTo`를 `auth/callback/` 방식으로 통일할지 결정 필요(현재는 현재 페이지 URL 사용).

### Part B 작업 목록

| ID | 작업 | 완료 기준 | 시점 |
|---|---|---|---|
| B1 | **실서버 전체 흐름 검증(게스트 쪽)**: 카카오 로그인·신청·마이페이지·미션 제출을 체크리스트대로 확인하고 화면 버그 수정 | 체크리스트 2·5·6단계 통과 | M3(11/15) |
| B2 | **가입 동의 화면 연결**: 신규 회원 첫 로그인 시 `OnboardingScreen` 표시 → `POST /me/onboarding`, 이후 원래 파티로 복귀(A2 필요) | 신규 계정으로 1회만 동의 표시 | M3 |
| B3 | **OAuth 복귀 경로 확정**: `redirectTo`를 `auth/callback/`로 통일할지 결정·구현, 로그인 취소·오류 화면 | 메인·탐색 페이지 모두 로그인 후 원래 위치 복귀 | M3 |
| B4 | **운영 모드 고정**: 운영 사이트에서 `?demo=1` 우회 차단, 설정 누락 시 fail-closed | E2E로 확인 | M3 |
| B5 | **요일 필터 정리**: 1회성 일시 기반(날짜/이번 주) 필터로 전환할지 PM과 결정 후 구현 | 실제 DB 파티가 필터에 맞게 노출 | M4 전 |
| B6 | **M4 모집용 화면 보강**: 파트너십 안내 문구·연락처 점검, 공유 링크(og 태그) 점검, 320~1440px 전체 수동 점검 | 모바일 캡처 확인 | M4 |
| B7 | 지도 기반 탐색(설계: `docs/MAP_EXPLORATION_DESIGN.md`). 카카오 JS 키·도메인 등록 필요 | — | **보류**(M6 이후) |

### 파트 간 계약

- API 경로·응답 필드는 A가 정한다. 바꿀 때는 `partylink/docs/party-connect-integration.md`를 같은 PR에서 고치고 B에게 알린다. B는 새 필드가 없어도 화면이 깨지지 않게 만든다.
- 마이그레이션 적용과 Edge Function 배포는 **PR 병합과 별개 단계**다. 운영 DB·배포·시크릿 변경은 Jacob이 직접 승인·실행한다.

### 보류 (이번 단계에서 하지 않음)

보완 요청 사유 저장, 관리 행위 감사 로그, 점주 로그인·점주 화면, 후기 테이블·관리, 업체 단독 상세 페이지, 네이티브 앱, 자동 청구.

## 8. 개발 흐름과 3곳 동기화

원격(GitHub)이 유일한 기준이다. 이 PC와 동료 PC는 원격 `main`을 받아 브랜치에서 작업하고 PR로만 합친다.

### 규칙

1. `main`에 직접 push하지 않는다. 모든 변경은 `a/…` 또는 `6Soo` 브랜치 → PR.
2. **CI가 초록일 때만 squash 병합**한다. 병합 후 브랜치는 삭제한다(6Soo 장기 브랜치 제외).
3. 작업 시작 전과 PR 올리기 전에 최신 `main`을 받는다.
4. 오래된 브랜치를 지울 때는 먼저 `archive/<브랜치명>` 태그를 남긴다(2026-11-10 정리 때 25개 보관).

### 매일 시작할 때 (두 PC 공통)

```bash
git fetch --prune
git switch main
git pull --ff-only
git switch -c a/작업이름        # Part B는 git switch 6Soo; git merge origin/main
```

### PR 올리기 전

```bash
git fetch
git rebase origin/main
npm run validate:jsx && npm run validate:html   # 웹 저장소
git push -u origin HEAD
```

로컬 E2E는 포트 3000을 다른 서버가 쓰고 있지 않은지 먼저 확인한다(다른 폴더의 서버가 응답하면 엉뚱한 코드를 테스트한다).

### 동료 PC 최초 설정

```bash
git clone https://github.com/J-Hype-Labs/party-connect-mvp.git
git clone https://github.com/J-Hype-Labs/partylink.git
```

이미 받아 둔 저장소가 있으면, 로컬에만 있는 변경이 없는지 `git status`와 `git log origin/main..`으로 확인한 뒤 위의 "매일 시작할 때" 순서를 따른다.

## 9. 테스트

| 종류 | 명령 | 범위 |
|---|---|---|
| 웹 정적 검증 | `npm run validate:jsx`, `npm run validate:html` | 모든 PR |
| 웹 E2E | `npm run test:e2e:full`, `npx playwright test tests/admin-*.spec.js` | 서버·인증은 mock(`tests/helpers/live-fixture.js`) |
| 서버 | `deno test --allow-env supabase/functions/partylink-api/handler_test.ts` | 라우트·권한·오류 매핑 |
| 실서버 | `docs/manual-e2e-checklist.md` | 카카오 로그인 + 운영 DB, 사람이 진행 |

테스트를 삭제·skip하거나 기대값을 느슨하게 바꿔서 통과시키지 않는다. CI 통과는 그 테스트가 실행한 범위만 증명한다.

## 10. 사람이 직접 해야 하는 일

- 카카오 개발자 콘솔의 앱 이름·동의 화면 문구를 HypeConnect로 변경
- 실서버 전체 흐름 검증(카카오 로그인 필요)
- M2 영업 현황과 Notion 마일스톤 상태 갱신
- 운영 DB 마이그레이션 적용, Edge Function 배포, 시크릿 변경 승인

## 11. 문서 지도

| 문서 | 내용 |
|---|---|
| `SPECIFICATION.md` | **이 문서. 단일 기준** |
| `partylink/docs/party-connect-integration.md` | API 계약, Supabase·카카오 설정 순서 |
| `partylink/docs/admin-page-spec.md` | 관리자 화면 확정 명세(v1.0) |
| `partylink/docs/settlement-check.md` | 정산 교차 검증 SQL |
| `docs/admin-page.md` | 관리자 화면 구성·실행·테스트 |
| `docs/manual-e2e-checklist.md` | 실서버 수동 검증 절차 |
| `docs/AUTH_IMPLEMENTATION_SPEC.md`, `AUTH_UI_UX_SPEC.md`, `AUTH_DEPLOYMENT_CHECKLIST.md` | 인증 상세 계약·화면·콘솔 절차 |
| `docs/MAP_EXPLORATION_DESIGN.md` | 지도 탐색 설계(보류) |
| `docs/archive/` | 이전 명세(전용 페이지 명세, UI/UX 결정 기록, ELI10 보고). 참고용, 기준 아님 |

문서를 고칠 때: 상태가 바뀌면 이 문서의 4장과 7장을 같은 PR에서 갱신한다. 상태는 "구현·검증됨 / 코드 존재·실서비스 미검증 / 미구현 / 보류"로 구분한다.
