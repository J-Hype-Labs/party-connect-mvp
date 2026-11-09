# 관리자 페이지 (`/admin/`)

메인 `index.html`의 데모 관리자 모달과 별개인 독립 페이지입니다. 카카오 로그인 후 서버(`GET /admin/me`, `admins` 테이블)가 권한을 확인합니다. 비밀번호는 없습니다.
서버 API는 `J-Hype-Labs/partylink`의 `docs/party-connect-integration.md`("관리자 API")와 `docs/admin-page-spec.md`를 따릅니다.

## 화면

| 메뉴 | 파일 | 내용 |
|---|---|---|
| 대시보드 | `js/admin-dashboard.js` | `GET /admin/summary` 숫자 카드. 카드를 누르면 해당 목록으로 이동 |
| 신청 | `js/admin-app.js` | 선정·반려·방문 인증·노쇼·최종 승인 (파티·상태 필터) |
| 파티 | `js/admin-parties.js` | 목록(상태 필터), 등록·수정, 상태 변경. 삭제 없음 — 취소(`CANCELLED`) 사용 |
| 점포·적립금 | `js/admin-stores.js` | 점포 등록·수정, 충전·환불, 원장, 잔액 부족 필터 |
| 게스트 | `js/admin-guests.js` | 목록, 노쇼·벌점, 차단·해제 |

- 공통 셸·API 클라이언트: `js/admin-app.js`, `js/admin-api.js`. 각 화면은 `window.ADMIN_SCREENS[name] = { open(content, opts) }`로 등록합니다.
- 인증 모듈 `js/auth-client.js`는 읽기 전용으로 재사용합니다. 수정하지 않습니다.
- 서버 오류 메시지(`{ code, message }`의 `message`)는 그대로 화면에 표시합니다.
- 사용자 입력은 `textContent`로만 넣습니다(`innerHTML` 금지).

## 열기

- 배포 사이트: `/admin/`
- 로컬: `/admin/?live=1` (없으면 "실서비스 설정이 필요합니다" 안내만 보임)
- 관리자 계정은 서버의 `admins` 테이블에 SQL로 등록합니다. 화면에서 추가·삭제하지 않습니다.

## 테스트

실제 Supabase를 호출하지 않고 SDK와 `/admin/*`를 모두 mock 합니다.

```bash
npx playwright test tests/admin-page.spec.js tests/admin-screens.spec.js --project=chromium
```

- 3000번 포트에 다른 개발 서버가 떠 있으면 Playwright가 그 서버를 재사용해 `/admin/`을 못 찾고 전부 실패합니다. 이때는 이 폴더에서 `python3 -m http.server 3012`로 서버를 띄우고 `CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3012`를 붙여 실행하세요.
- 기존 `comprehensive.spec.js` 등 메인 페이지 테스트와 독립된 파일입니다.

## 남은 일

- 메인 `index.html`의 데모 관리자 모달과 하드코딩 비밀번호(`ADMIN_PASSWORD`) 제거 → `/admin/` 링크로 교체 (협업자와 시점 조율 필요)
- 실서버(실제 카카오 로그인 + 배포된 Edge Function) 연결 확인
- 통계 화면(A6), 후기 관리(A7)는 명세상 후속 범위
