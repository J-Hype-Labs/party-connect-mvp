import { test, expect } from './helpers/test-base.js';

// 관리자 페이지 — 대시보드 / 게스트 화면. (파티·점포·적립금은 tests/admin-catalog.spec.js)
// 실제 Supabase 를 호출하지 않고 SDK 와 /admin/* API 를 모두 mock 합니다. (tests/admin-page.spec.js 와 같은 방식, 독립 파일)

const PROJECT = 'https://admin-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const guest = (o) => Object.assign({ id: 'g1', name: '홍길동', phone: '01012345678', instagram: null, noshowCount: 0, penaltyCount: 0, isBlocked: false, blockedUntil: null }, o);

// handlers: { 'METHOD path': (body, url) => { status, body } }  — 없는 경로는 404
async function setup(page, handlers) {
  const calls = [];
  await page.addInitScript((s) => { window.__SESSION = s; }, SESSION);
  await page.route('**/supabase.js', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.supabase = { createClient: function () { return { auth: {
      getSession: async function () { return { data: { session: window.__SESSION } }; },
      signInWithOAuth: async function () { return { error: null }; },
      signOut: async function () { return { error: null }; },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    } }; } };`,
  }));
  await page.route('**/admin/?live=1', async (route) => {
    const res = await route.fetch();
    const html = (await res.text())
      .replace(/supabaseUrl: "[^"]*"/, 'supabaseUrl: "' + PROJECT + '"')
      .replace(/supabaseAnonKey: "[^"]*"/, 'supabaseAnonKey: "public-test-anon"');
    await route.fulfill({ response: res, body: html });
  });
  await page.route(API + '**', async (route) => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const path = url.pathname.replace('/functions/v1/partylink-api/', '');
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    calls.push({ method: req.method(), path, search: url.search, body });
    const json = (status, b) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(b) });
    if (path === 'admin/me') return json(200, { isAdmin: true, userId: 'u1' });
    if (path === 'admin/applications' || path === 'admin/parties') return json(200, []); // 첫 화면(신청 관리)이 부르는 목록
    const h = handlers[req.method() + ' ' + path];
    const r = h ? h(body, url) : null;
    return r ? json(r.status, r.body) : json(404, { message: 'unexpected ' + req.method() + ' ' + path });
  });
  return calls;
}

const open = (page) => page.goto('/admin/?live=1');
const nav = (page, name) => page.locator(`[data-nav="${name}"]`).click();
const writes = (calls) => calls.filter((c) => c.method !== 'GET');

test.describe('관리자 — 대시보드', () => {
  test('숫자 카드를 보여 주고, 카드를 누르면 해당 목록으로 이동한다', async ({ page }) => {
    const calls = await setup(page, {
      'GET admin/summary': () => ({ status: 200, body: { pendingApplications: 3, openParties: 1, partiesThisWeek: 2, lowBalanceStores: 1, blockedGuests: 4, asOf: '2026-11-09T05:00:00Z' } }),
    });
    await open(page);
    await nav(page, 'dashboard');
    await expect(page.locator('[data-stat="pendingApplications"] .stat-num')).toHaveText('3');
    await expect(page.locator('[data-stat="blockedGuests"] .stat-num')).toHaveText('4');
    await page.locator('[data-stat="pendingApplications"]').click();
    await expect(page.getByRole('heading', { name: '신청 관리' })).toBeVisible();
    await expect(page.locator('#filter-status')).toHaveValue('APPLIED');
    expect(calls.some((c) => c.path === 'admin/applications' && c.search.includes('status=APPLIED'))).toBe(true);
  });

  test('집계를 불러오지 못하면 서버 메시지와 다시 시도 버튼을 보여 준다', async ({ page }) => {
    await setup(page, { 'GET admin/summary': () => ({ status: 500, body: { message: '일시적인 오류가 발생했습니다.' } }) });
    await open(page);
    await nav(page, 'dashboard');
    await expect(page.getByText('일시적인 오류가 발생했습니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});

test.describe('관리자 — 게스트', () => {
  test('차단/해제: 확인 후 blocked 값을 보내고 상태를 갱신한다', async ({ page }) => {
    const gs = [guest(), guest({ id: 'g2', name: '차단됨', isBlocked: true })];
    const calls = await setup(page, {
      'GET admin/guests': () => ({ status: 200, body: gs }),
      'POST admin/guests/g1/block': (b) => { gs[0].isBlocked = b.blocked; return { status: 200, body: gs[0] }; },
      'POST admin/guests/g2/block': (b) => { gs[1].isBlocked = b.blocked; return { status: 200, body: gs[1] }; },
    });
    await open(page);
    await nav(page, 'guests');
    await expect(page.locator('[data-guest-id="g1"] .badge')).toHaveText('정상');
    await page.locator('[data-guest-id="g1"] [data-action="block"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-guest-id="g1"] .badge')).toHaveText('차단');
    await page.locator('[data-guest-id="g2"] [data-action="unblock"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-guest-id="g2"] .badge')).toHaveText('정상');
    expect(writes(calls).map((c) => [c.path, c.body])).toEqual([
      ['admin/guests/g1/block', { blocked: true }], ['admin/guests/g2/block', { blocked: false }],
    ]);
  });

  test('"차단된 게스트만" 필터는 서버에 blocked=1 을 보낸다', async ({ page }) => {
    const calls = await setup(page, { 'GET admin/guests': () => ({ status: 200, body: [] }) });
    await open(page);
    await nav(page, 'guests');
    await page.locator('#guest-blocked').check();
    await expect(page.locator('#empty')).toBeVisible();
    expect(calls.some((c) => c.path === 'admin/guests' && c.search.includes('blocked=1'))).toBe(true);
  });
});

test('모바일(360px)에서 대시보드와 게스트 목록이 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await setup(page, {
    'GET admin/summary': () => ({ status: 200, body: { pendingApplications: 3, openParties: 1, partiesThisWeek: 2, lowBalanceStores: 1, blockedGuests: 4, asOf: '2026-11-09T05:00:00Z' } }),
    'GET admin/guests': () => ({ status: 200, body: [guest({ name: '아주아주아주아주아주아주긴이름의게스트', instagram: 'a_very_long_instagram_handle_name_here' })] }),
  });
  await open(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await nav(page, 'dashboard');
  await expect(page.locator('[data-stat="pendingApplications"]')).toBeVisible();
  expect(await overflow()).toBe(false);
  await nav(page, 'guests');
  await expect(page.locator('#guest-list .card')).toHaveCount(1);
  expect(await overflow()).toBe(false);
});
