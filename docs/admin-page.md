# 관리자 페이지 (`/admin/`)

메인 `index.html`의 데모 관리자 모달과 별개인 독립 페이지입니다. 카카오 로그인 후 서버(`GET /admin/me`, `admins` 테이블)가 권한을 확인합니다. 비밀번호는 없습니다.
서버 API는 `J-Hype-Labs/partylink`의 `docs/party-connect-integration.md`("관리자 API")와 `docs/admin-page-spec.md`를 따릅니다.

## 화면과 파일

| 메뉴 | 파일 | 내용 |
|---|---|---|
| (공통) 헤더 | `js/admin-app.js`, `admin/admin.css` | HypeConnect 로고(`assets/hypeconnect-logo.svg`, `alt`=HypeConnect)와 파비콘(`assets/hypeconnect-icon.svg`) |
| 신청 | `js/admin-app.js` | 선정·반려·방문 인증·노쇼·최종 승인·미션 보완 요청 (파티·상태 필터) |
| 대시보드 | `js/admin-ops.js` | `GET /admin/summary` 집계 타일. 타일을 누르면 해당 화면으로 이동 |
| 파티 | `js/admin-catalog.js` | 목록(상태 필터), 등록·수정, 상태 변경. 삭제 없음 — 취소(`CANCELLED`) 사용 |
| 점포·적립금 | `js/admin-catalog.js` | 점포 등록·수정, 충전·환불, 거래 내역, **원장 CSV 저장** |
| 게스트 | `js/admin-ops.js` | 목록, 차단·해제 |

- 공통 셸·내비게이션: `js/admin-app.js`. 각 화면은 `window.ADMIN_VIEWS[name]`에 등록하고, 공통 도구는 `window.ADMIN_UI`로 받습니다.
- API 클라이언트: `js/admin-api.js`. 인증 모듈 `js/auth-client.js`는 읽기 전용으로 재사용하며 수정하지 않습니다.
- 서버 오류 메시지(`{ code, message }`의 `message`)는 그대로 화면에 표시합니다.
- 사용자 입력은 `textContent`로만 넣습니다(`innerHTML` 금지).

## 정산 내역 CSV 저장

**점포·적립금 → 점포 카드 → CSV 저장**: 해당 점포의 적립금 원장(충전·차감·환불)을 CSV 파일로 저장합니다. 수동 정산과 입금 대조용입니다.

- **컬럼:** 일시(KST), 점포, 구분, 금액, 변경 전 잔액, 변경 후 잔액, 입금자명, 메모, 신청 ID, 거래 ID. **오래된 순**입니다.
- **데이터:** 기존 `GET /admin/stores/:id/deposits?limit=500`만 사용합니다. 서버가 허용하는 최대 500건이라, 500건에 도달하면 "최근 500건까지만 포함됩니다"라고 알려 줍니다. 그 이상은 서버 집계가 필요합니다(명세 A5).
- **엑셀 한글:** 파일 앞에 UTF-8 BOM을 붙여서 한글이 깨지지 않습니다.
- **CSV 인젝션 방지:** 문자열이 `=`, `+`, `-`, `@`, 탭, CR로 시작하면 앞에 `'`를 붙입니다(입금자명·메모 등). 숫자 값은 그대로 둡니다.
- **파일 이름:** `hypeconnect-ledger-<점포명>-<YYYYMMDD>.csv` (경로·특수문자는 `_`로 바꿈).
- **개인정보 주의:** 입금자명이 들어 있으므로 저장한 파일은 정산 후 안전하게 보관·삭제하세요.
- 구현: `js/admin-csv.js`(순수 함수, `window.ADMIN_CSV`), 버튼과 호출은 `js/admin-catalog.js`. 테스트: `tests/admin-csv.spec.js`.

## 열기

- 배포 사이트: `/admin/`
- 로컬: `/admin/?live=1` (없으면 "실서비스 설정이 필요합니다" 안내만 보임)
- 관리자 계정은 서버의 `admins` 테이블에 SQL로 등록합니다. 화면에서 추가·삭제하지 않습니다.

## 테스트

실제 Supabase를 호출하지 않고 SDK와 `/admin/*`를 모두 mock 합니다. 메인 페이지 테스트(`comprehensive.spec.js` 등)와 독립된 파일입니다.

```bash
npx playwright test tests/admin-*.spec.js --project=chromium
```

- 3000번 포트에 다른 개발 서버가 떠 있으면 Playwright가 그 서버를 재사용해 `/admin/`을 못 찾고 전부 실패합니다. 이때는 이 폴더에서 `python3 -m http.server 3012`로 서버를 띄우고 `CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3012`를 붙여 실행하세요.

## 남은 일

- 메인 `index.html`의 데모 관리자 모달과 하드코딩 비밀번호(`ADMIN_PASSWORD`) 제거 완료. `/admin/` 링크는 별도 작업(첫페이지 세션)에서 다룸
- 실서버(실제 카카오 로그인 + 배포된 Edge Function) 연결 확인
- 통계 화면, 후기 관리는 명세상 후속 범위
