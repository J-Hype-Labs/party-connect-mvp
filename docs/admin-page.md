# 관리자 페이지 (`/admin/`)

메인 `index.html`의 데모 관리자 모달과 별개인 독립 페이지입니다. 카카오 로그인 후 서버(`GET /admin/me`, `admins` 테이블)가 권한을 확인합니다. 비밀번호는 없습니다.
서버 API는 `J-Hype-Labs/partylink`의 `docs/party-connect-integration.md`("관리자 API")와 `docs/admin-page-spec.md`를 따릅니다.

## 화면과 파일

| 메뉴 | 파일 | 내용 |
|---|---|---|
| 신청 | `js/admin-app.js` | 선정·반려·방문 인증·노쇼·최종 승인·미션 보완 요청 (파티·상태 필터) |
| 대시보드 | `js/admin-ops.js` | `GET /admin/summary` 집계 타일. 타일을 누르면 해당 화면으로 이동 |
| 파티 | `js/admin-catalog.js` | 목록(상태 필터), 등록·수정, 상태 변경. 삭제 없음 — 취소(`CANCELLED`) 사용 |
| 점포·적립금 | `js/admin-catalog.js` | 점포 등록·수정, 충전·환불, 거래 내역 |
| 게스트 | `js/admin-ops.js` | 목록, 차단·해제 |

- 공통 셸·내비게이션: `js/admin-app.js`. 각 화면은 `window.ADMIN_VIEWS[name]`에 등록하고, 공통 도구는 `window.ADMIN_UI`로 받습니다.
- API 클라이언트: `js/admin-api.js`. 인증 모듈 `js/auth-client.js`는 읽기 전용으로 재사용하며 수정하지 않습니다.
- 서버 오류 메시지(`{ code, message }`의 `message`)는 그대로 화면에 표시합니다.
- 사용자 입력은 `textContent`로만 넣습니다(`innerHTML` 금지).

## 열기

- 배포 사이트: `/admin/`
- 로컬: `/admin/?live=1` (없으면 "실서비스 설정이 필요합니다" 안내만 보임)
- 관리자 계정은 서버의 `admins` 테이블에 SQL로 등록합니다. 화면에서 추가·삭제하지 않습니다.

## 테스트

실제 Supabase를 호출하지 않고 SDK와 `/admin/*`를 모두 mock 합니다. 메인 페이지 테스트(`comprehensive.spec.js` 등)와 독립된 파일입니다.

```bash
npx playwright test tests/admin-page.spec.js tests/admin-catalog.spec.js tests/admin-ops.spec.js --project=chromium
```

- 3000번 포트에 다른 개발 서버가 떠 있으면 Playwright가 그 서버를 재사용해 `/admin/`을 못 찾고 전부 실패합니다. 이때는 이 폴더에서 `python3 -m http.server 3012`로 서버를 띄우고 `CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3012`를 붙여 실행하세요.

## 남은 일

- 메인 `index.html`의 데모 관리자 모달과 하드코딩 비밀번호(`ADMIN_PASSWORD`) 제거 완료. `/admin/` 링크는 별도 작업(첫페이지 세션)에서 다룸
- 실서버(실제 카카오 로그인 + 배포된 Edge Function) 연결 확인
- 통계 화면, 후기 관리는 명세상 후속 범위
