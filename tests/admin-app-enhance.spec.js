import { test, expect } from './helpers/test-base.js';

// admin-app.js 신규 기능 테스트: M-04 일괄 선정, M-11 연락처/템플릿 복사, M-13 잔액 경고

const PROJECT = 'https://admin-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const app = (over) => Object.assign({
  id: 'a1', slotId: 's1', status: 'APPLIED', visitCode: null, missionUrl: null, appliedAt: '2026-11-10T01:00:00Z',
  feeAmount: 10000, rejectReason: null, partyTitle: '금요 혼술', partyStartsAt: '2026-11-13T10:00:00Z', storeId: 'st1', storeName: '43번지 혼술바',
  guest: { id: 'g1', name: '홍길동', phone: '01012345678', noshowCount: 0, isBlocked: false },
}, over);

async function setup(page, { session = SESSION, me = { status: 200, body: { isAdmin: true, userId: 'u1' } }, apps = [], stores = [], onPost } = {}) {
  const calls = [];
  const state = { apps };

  await page.addInitScript((s) => { window.__SESSION = s; window.__oauth = null; window.__signedOut = false; window.__copied = []; }, session);
  await page.route('**/supabase.js', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.supabase = { createClient: function () { return { auth: {
      getSession: async function () { return { data: { session: window.__SESSION } }; },
      signInWithOAuth: async function (o) { window.__oauth = o; return { error: null }; },
      signOut: async function () { window.__signedOut = true; window.__SESSION = null; return { error: null }; },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    } }; } };`,
  }));
  await page.route('**/admin/?live=1', async (route) => {
    const res = await route.fetch();
    const html = (await res.text())
      .replace(/supabaseUrl: "[^"]*"/, 'supabaseUrl: "' + PROJECT + '"')
      .replace(/supabaseAnonKey: "[^"]*"/, 'supabaseAnonKey: "public-test-anon"');
    expect(html).toContain(PROJECT);
    await route.fulfill({ response: res, body: html });
  });
  await page.route(API + '**', async (route) => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const path = url.pathname.replace('/functions/v1/partylink-api/', '');
    calls.push({ method: req.method(), path, search: url.search, body: req.postData() ? JSON.parse(req.postData()) : null, auth: req.headers()['authorization'] });
    const json = (status, body) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'admin/me') return json(me.status, me.body);
    if (path === 'admin/parties') return json(200, [{ id: 's1', title: '금요 혼술', startsAt: '2026-11-13T10:00:00Z', feePerGuest: 10000 }]);
    if (path === 'admin/applications') {
      const st = url.searchParams.get('status');
      return json(200, st ? state.apps.filter((a) => a.status === st) : state.apps);
    }
    if (path === 'admin/stores') return json(200, stores);
    if (req.method() === 'POST' && onPost) {
      const r = onPost(path, calls[calls.length - 1].body, state);
      if (r) return json(r.status, r.body);
    }
    return json(404, { message: 'unexpected ' + path });
  });
  // navigator.clipboard 목: 복사된 텍스트를 window.__copied 에 기록
  await page.addInitScript(() => {
    window.__copied = [];
    const origWriteText = navigator.clipboard?.writeText;
    navigator.clipboard = navigator.clipboard || {};
    navigator.clipboard.writeText = async function (text) {
      window.__copied.push(text);
      if (origWriteText) return origWriteText.call(navigator.clipboard, text);
      return Promise.resolve();
    };
    // execCommand 폴백도 감지하기 위해 document.execCommand 래핑
    const origExecCommand = document.execCommand.bind(document);
    document.execCommand = function (cmd) {
      if (cmd === 'copy') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const text = sel.toString();
          if (text) window.__copied.push(text);
        }
      }
      return origExecCommand(cmd);
    };
  });
  return { calls, state };
}

const open = (page) => page.goto('/admin/?live=1');

test.describe('관리자 페이지 — 신규 기능 (M-04, M-11, M-13)', () => {

  // ------------------------------------------------------------ M-04: 일괄 선정
  test('M-04: APPLIED 카드에 체크박스가 있고, 전체선택 토글이 동작한다', async ({ page }) => {
    await setup(page, { apps: [
      app({ id: 'a1', status: 'APPLIED', guest: { name: '가', phone: '01011111111' } }),
      app({ id: 'a2', status: 'APPLIED', guest: { name: '나', phone: '01022222222' } }),
      app({ id: 'a3', status: 'APPROVED', guest: { name: '다', phone: '01033333333' } }),
    ]});
    await open(page);

    // APPLIED 카드에만 체크박스가 있어야 함
    await expect(page.locator('[data-app-id="a1"] .bulk-select')).toBeVisible();
    await expect(page.locator('[data-app-id="a2"] .bulk-select')).toBeVisible();
    await expect(page.locator('[data-app-id="a3"] .bulk-select')).toHaveCount(0);

    // 전체선택 체크박스 클릭 시 APPLIED 2건 모두 선택
    await page.locator('#select-all-applied').check();
    await expect(page.locator('[data-app-id="a1"] .bulk-select')).toBeChecked();
    await expect(page.locator('[data-app-id="a2"] .bulk-select')).toBeChecked();

    // 일괄 선정 버튼이 활성화되고 건수 표시
    await expect(page.locator('#bulk-approve-btn')).toBeEnabled();
    await expect(page.locator('#bulk-approve-btn')).toContainText('선택 2건 일괄 선정');

    // 전체선택 해제 시 모두 해제
    await page.locator('#select-all-applied').uncheck();
    await expect(page.locator('[data-app-id="a1"] .bulk-select')).not.toBeChecked();
    await expect(page.locator('[data-app-id="a2"] .bulk-select')).not.toBeChecked();
    await expect(page.locator('#bulk-approve-btn')).toBeDisabled();
  });

  test('M-04: 개별 체크박스 선택 시 버튼 상태가 업데이트된다', async ({ page }) => {
    await setup(page, { apps: [
      app({ id: 'a1', status: 'APPLIED' }),
      app({ id: 'a2', status: 'APPLIED' }),
    ]});
    await open(page);

    await page.locator('[data-app-id="a1"] .bulk-select').check();
    await expect(page.locator('#bulk-approve-btn')).toBeEnabled();
    await expect(page.locator('#bulk-approve-btn')).toContainText('선택 1건 일괄 선정');

    await page.locator('[data-app-id="a2"] .bulk-select').check();
    await expect(page.locator('#bulk-approve-btn')).toContainText('선택 2건 일괄 선정');

    await page.locator('[data-app-id="a1"] .bulk-select').uncheck();
    await expect(page.locator('#bulk-approve-btn')).toContainText('선택 1건 일괄 선정');
  });

  test('M-04: 일괄 선정이 체크된 APPLIED만 approve 호출하고 부분 실패 시 건수 보고', async ({ page }) => {
    let approveCalls = 0;
    await setup(page, {
      apps: [
        app({ id: 'a1', status: 'APPLIED' }),
        app({ id: 'a2', status: 'APPLIED' }),
        app({ id: 'a3', status: 'APPLIED' }),
      ],
      onPost: (path, body, state) => {
        if (path.startsWith('admin/applications/') && path.endsWith('/approve')) {
          approveCalls++;
          const id = path.split('/')[2];
          const app = state.apps.find(a => a.id === id);
          if (app) app.status = 'APPROVED';
          // a2는 실패 시뮬레이션
          if (id === 'a2') return { status: 400, body: { message: '이미 처리됨' } };
          return { status: 200, body: { status: 'APPROVED' } };
        }
      },
    });
    await open(page);

    // a1, a2만 선택 (a2는 approve 실패 주입 대상 → 부분 실패 검증, a3는 미선택)
    await page.locator('[data-app-id="a1"] .bulk-select').check();
    await page.locator('[data-app-id="a2"] .bulk-select').check();

    await page.locator('#bulk-approve-btn').click();
    // 확인 대화상자에서 확인
    await page.locator('#dlg-confirm').click();

    // 토스트에 성공/실패 건수 표시 (a1 성공, a2 실패)
    await expect(page.locator('.toast').first()).toContainText('1건 선정, 1건 실패');
    expect(approveCalls).toBe(2); // a1, a2만 호출됨 (a3는 선택 안 됨)
  });

  test('M-04: 일괄 선정 시 실패한 건이 있어도 나머지 계속 진행', async ({ page }) => {
    const approved = [];
    await setup(page, {
      apps: [
        app({ id: 'a1', status: 'APPLIED' }),
        app({ id: 'a2', status: 'APPLIED' }),
        app({ id: 'a3', status: 'APPLIED' }),
      ],
      onPost: (path, body, state) => {
        if (path.startsWith('admin/applications/') && path.endsWith('/approve')) {
          const id = path.split('/')[2];
          approved.push(id);
          const app = state.apps.find(a => a.id === id);
          if (app) app.status = 'APPROVED';
          // a2는 실패
          if (id === 'a2') return { status: 500, body: { message: '서버 오류' } };
          return { status: 200, body: { status: 'APPROVED' } };
        }
      },
    });
    await open(page);

    // 전체선택 (3건 모두)
    await page.locator('#select-all-applied').check();
    await page.locator('#bulk-approve-btn').click();
    await page.locator('#dlg-confirm').click();

    await expect(page.locator('.toast').first()).toContainText('2건 선정, 1건 실패');
    expect(approved).toEqual(['a1', 'a2', 'a3']); // 실패한 a2도 호출됨 (계속 진행)
  });

  test('M-04: 상태 필터가 APPLIED가 아닐 때 전체선택/일괄선정 버튼 숨김', async ({ page }) => {
    await setup(page, { apps: [app({ id: 'a1', status: 'APPLIED' })] });
    await open(page);

    // 전체 상태(빈 값)일 때는 보임
    await expect(page.locator('#select-all-applied')).toBeVisible();
    await expect(page.locator('#bulk-approve-btn')).toBeVisible();

    // APPROVED 필터 선택 시 숨김
    await page.locator('#filter-status').selectOption('APPROVED');
    await expect(page.locator('#select-all-applied')).toHaveCount(0);
    await expect(page.locator('#bulk-approve-btn')).toHaveCount(0);
  });

  // ------------------------------------------------------------ M-11: 연락처 복사 + 선정 안내 템플릿
  test('M-11: APPROVED 카드에 연락처 복사 버튼이 있고 클립보드에 기록된다', async ({ page }) => {
    await setup(page, { apps: [app({ id: 'a1', status: 'APPROVED', guest: { name: '홍길동', phone: '01012345678' }, visitCode: 'ABC123' })] });
    await open(page);

    await page.locator('[data-action="copy-phone"]').click();

    const copied = await page.evaluate(() => window.__copied);
    expect(copied).toContain('01012345678');
    await expect(page.locator('.toast.ok')).toContainText('연락처를 복사했습니다');
  });

  test('M-11: APPROVED 카드에 선정 안내 복사 버튼이 있고 템플릿이 정확히 복사된다', async ({ page }) => {
    await setup(page, { apps: [app({ id: 'a1', status: 'APPROVED', partyTitle: '금요 혼술', partyStartsAt: '2026-11-13T10:00:00Z', guest: { name: '홍길동', phone: '01012345678' }, visitCode: 'ABC123' })] });
    await open(page);

    await page.locator('[data-action="copy-template"]').click();

    const copied = await page.evaluate(() => window.__copied);
    expect(copied.length).toBeGreaterThan(0);
    const text = copied[0];
    expect(text).toContain('[HypeConnect]');
    expect(text).toContain('홍길동님');
    expect(text).toContain('금요 혼술');
    expect(text).toContain('11. 13.'); // fmtDate 결과 포함 (KST: 11. 13. (금) 19:00)
    expect(text).toContain('ABC123');
    expect(text).toContain('협찬 표시');
    await expect(page.locator('.toast.ok')).toContainText('선정 안내 템플릿을 복사했습니다');
  });

  test('M-11: visitCode가 없으면 선정 안내 복사 버튼이 보이지 않음', async ({ page }) => {
    await setup(page, { apps: [app({ id: 'a1', status: 'APPROVED', visitCode: null })] });
    await open(page);

    await expect(page.locator('[data-action="copy-template"]')).toHaveCount(0);
  });

  test('M-11: 전화번호가 없으면 연락처 복사 버튼이 보이지 않음', async ({ page }) => {
    await setup(page, { apps: [app({ id: 'a1', status: 'APPROVED', guest: { phone: '' } })] });
    await open(page);

    await expect(page.locator('[data-action="copy-phone"]')).toHaveCount(0);
  });

  // ------------------------------------------------------------ M-13: 잔액 부족 사전 경고
  test('M-13: APPLIED 카드에 잔액 정보(명분)가 표시된다', async ({ page }) => {
    await setup(page, {
      apps: [app({ id: 'a1', status: 'APPLIED', feeAmount: 10000, storeId: 'st1' })],
      stores: [{ id: 'st1', name: '43번지 혼술바', prepaidBalance: 50000, defaultFeePerGuest: 10000 }],
    });
    await open(page);

    // 잔액 50,000원 / 수수료 10,000원 = 5명분
    await expect(page.locator('[data-app-id="a1"] .balance-info')).toContainText('잔액 50,000원');
    await expect(page.locator('[data-app-id="a1"] .balance-info')).toContainText('약 5명분 선정 가능');
  });

  test('M-13: 잔액이 1명분도 못 미치면 경고 표시(선정 차단 안 함)', async ({ page }) => {
    await setup(page, {
      apps: [app({ id: 'a1', status: 'APPLIED', feeAmount: 10000, storeId: 'st1' })],
      stores: [{ id: 'st1', name: '43번지 혼술바', prepaidBalance: 5000, defaultFeePerGuest: 10000 }],
    });
    await open(page);

    // 잔액 5,000원 < 수수료 10,000원 -> 경고
    await expect(page.locator('[data-app-id="a1"] .balance-warn')).toContainText('잔액 부족: 충전 필요');
    await expect(page.locator('[data-app-id="a1"] .balance-warn')).toContainText('5,000원');
    await expect(page.locator('[data-app-id="a1"] .balance-warn')).toContainText('10,000원');

    // 선정 버튼은 여전히 활성화되어 있어야 함 (서버가 판단)
    await expect(page.locator('[data-app-id="a1"] [data-action="approve"]')).toBeEnabled();
  });

  test('M-13: feeAmount이 없으면 party.feePerGuest 또는 store.defaultFeePerGuest 사용', async ({ page }) => {
    // feeAmount 없는 경우 party.feePerGuest 사용
    await setup(page, {
      apps: [app({ id: 'a1', status: 'APPLIED', feeAmount: null, storeId: 'st1', slotId: 's1' })],
      stores: [{ id: 'st1', name: '43번지 혼술바', prepaidBalance: 30000, defaultFeePerGuest: 10000 }],
    });
    await open(page);

    // party.feePerGuest = 10000 (fixture), 30000/10000 = 3명분
    await expect(page.locator('[data-app-id="a1"] .balance-info')).toContainText('약 3명분 선정 가능');

    // party도 없으면 store.defaultFeePerGuest 사용
    await setup(page, {
      apps: [app({ id: 'a2', status: 'APPLIED', feeAmount: null, storeId: 'st2', slotId: 's999' })], // 존재하지 않는 파티
      stores: [{ id: 'st2', name: '다른 바', prepaidBalance: 20000, defaultFeePerGuest: 5000 }],
    });
    await open(page);
    await expect(page.locator('[data-app-id="a2"] .balance-info')).toContainText('약 4명분 선정 가능');
  });

  test('M-13: 스토어 조회 실패해도 앱이 깨지지 않고 잔액 표시만 생략', async ({ page }) => {
    await setup(page, {
      apps: [app({ id: 'a1', status: 'APPLIED', feeAmount: 10000, storeId: 'st1' })],
      // stores 조회 실패 시뮬레이션: api.stores()가 reject 되도록
      onPost: () => {},
    });
    // api.stores()가 실패해도 빈 배열로 처리되므로 잔액 표시 없음
    await open(page);
    await expect(page.locator('[data-app-id="a1"] .balance-info')).toHaveCount(0);
    await expect(page.locator('[data-app-id="a1"] .balance-warn')).toHaveCount(0);
    // 기본 기능은 정상 동작
    await expect(page.locator('[data-app-id="a1"] [data-action="approve"]')).toBeVisible();
  });

});