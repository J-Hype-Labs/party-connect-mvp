import { test, expect } from './helpers/test-base.js';

// 관리자 페이지(/admin/) 테스트.
// 실제 Supabase/계정/DB 를 호출하지 않고 SDK 와 /admin/* API 를 모두 mock 합니다.
// 기존 comprehensive/user-journey 테스트와 독립된 파일입니다.

const PROJECT = 'https://admin-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const app = (over) => Object.assign({
  id: 'a1', slotId: 's1', status: 'APPLIED', visitCode: null, missionUrl: null, appliedAt: '2026-11-10T01:00:00Z',
  feeAmount: 10000, rejectReason: null, partyTitle: '금요 혼술', partyStartsAt: '2026-11-13T10:00:00Z', storeId: 'st1', storeName: '43번지 혼술바',
  guest: { id: 'g1', name: '홍길동', phone: '01012345678', noshowCount: 0, isBlocked: false },
}, over);

async function setup(page, { session = SESSION, me = { status: 200, body: { isAdmin: true, userId: 'u1' } }, apps = [], onPost } = {}) {
  const calls = [];
  const state = { apps };

  await page.addInitScript((s) => { window.__SESSION = s; window.__oauth = null; window.__signedOut = false; }, session);
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
    if (path === 'admin/parties') return json(200, [{ id: 's1', title: '금요 혼술', startsAt: '2026-11-13T10:00:00Z' }]);
    if (path === 'admin/applications') {
      const st = url.searchParams.get('status');
      return json(200, st ? state.apps.filter((a) => a.status === st) : state.apps);
    }
    if (req.method() === 'POST' && onPost) {
      const r = onPost(path, calls[calls.length - 1].body, state);
      if (r) return json(r.status, r.body);
    }
    return json(404, { message: 'unexpected ' + path });
  });
  return { calls, state };
}

const open = (page) => page.goto('/admin/?live=1');

test.describe('관리자 페이지 — 접근 통제', () => {
  test('실서비스 모드가 아니면 안내만 보여 준다', async ({ page }) => {
    await page.goto('/admin/');
    await expect(page.getByRole('heading', { name: '실서비스 설정이 필요합니다' })).toBeVisible();
  });

  test('로그인하지 않았으면 카카오 로그인 버튼만 보이고 API 를 호출하지 않는다', async ({ page }) => {
    const { calls } = await setup(page, { session: null });
    await open(page);
    await expect(page.getByRole('heading', { name: '관리자 로그인' })).toBeVisible();
    expect(calls.length).toBe(0);
    await page.locator('#login-btn').click();
    const oauth = await page.evaluate(() => window.__oauth);
    expect(oauth.provider).toBe('kakao');
    expect(oauth.options.redirectTo).toContain('/admin/');
  });

  test('관리자가 아니면(403) 권한 없음 화면과 다른 계정 로그인만 보인다', async ({ page }) => {
    const { calls } = await setup(page, { me: { status: 403, body: { message: '권한이 없습니다.' } } });
    await open(page);
    await expect(page.getByRole('heading', { name: '권한이 없습니다' })).toBeVisible();
    await expect(page.locator('#app-list')).toHaveCount(0);
    expect(calls.map((c) => c.path)).toEqual(['admin/me']);
    await page.locator('#logout-btn').click();
    await expect(page.getByRole('heading', { name: '관리자 로그인' })).toBeVisible();
    expect(await page.evaluate(() => window.__signedOut)).toBe(true);
  });

  test('서버 연결 실패 시 다시 시도 버튼을 보여 준다', async ({ page }) => {
    await setup(page, { me: { status: 500, body: { message: '일시적인 오류가 발생했습니다.' } } });
    await open(page);
    await expect(page.getByRole('heading', { name: '연결하지 못했습니다' })).toBeVisible();
    await expect(page.locator('#retry-btn')).toBeVisible();
  });

  test('토큰이 만료되면(401) 로그인 화면으로 돌아간다', async ({ page }) => {
    const { state } = await setup(page, { apps: [app()], onPost: () => ({ status: 401, body: { message: '로그인이 필요합니다.' } }) });
    await open(page);
    await expect(page.locator('[data-app-id="a1"]')).toBeVisible();
    await page.locator('[data-action="approve"]').click();
    await expect(page.getByRole('heading', { name: '관리자 로그인' })).toBeVisible();
    expect(state.apps.length).toBe(1);
  });
});

test.describe('관리자 페이지 — 신청 관리', () => {
  const full = () => [
    app({ id: 'a1', status: 'APPLIED' }),
    app({ id: 'a2', status: 'APPROVED', visitCode: 'K7M2ABCD12', guest: { id: 'g2', name: '김철수', phone: '01099998888', noshowCount: 1, isBlocked: false } }),
    app({ id: 'a3', status: 'MISSION_SUBMITTED', missionUrl: 'https://instagram.com/p/x', feeAmount: 12000 }),
    app({ id: 'a4', status: 'COMPLETED' }),
  ];

  test('상태별로 허용된 버튼만 보인다', async ({ page }) => {
    await setup(page, { apps: full() });
    await open(page);
    const actions = async (id) => page.locator(`[data-app-id="${id}"] [data-action]`).evaluateAll((els) => els.map((e) => e.dataset.action));
    await expect(page.locator('#app-list li')).toHaveCount(4);
    expect(await actions('a1')).toEqual(['approve', 'reject']);
    expect(await actions('a2')).toEqual(['verify-visit', 'noshow']);
    expect(await actions('a3')).toEqual(['complete', 'request-revision']);
    expect(await actions('a4')).toEqual([]);
  });

  test('선정: 한 번 요청하고 결과를 목록에 반영한다', async ({ page }) => {
    const { calls } = await setup(page, {
      apps: [app()],
      onPost: (path, body, state) => { state.apps[0].status = 'APPROVED'; return { status: 200, body: { status: 'APPROVED' } }; },
    });
    await open(page);
    await page.locator('[data-action="approve"]').click();
    await expect(page.locator('[data-app-id="a1"] .badge')).toHaveText('선정');
    await expect(page.locator('.toast.ok')).toContainText('선정했습니다');
    expect(calls.filter((c) => c.path === 'admin/applications/a1/approve').length).toBe(1);
    expect(calls.find((c) => c.path === 'admin/applications/a1/approve').auth).toBe('Bearer admin-token');
  });

  test('반려: 사유를 함께 보낸다', async ({ page }) => {
    const { calls } = await setup(page, {
      apps: [app()],
      onPost: (path, body, state) => { state.apps[0].status = 'REJECTED'; return { status: 200, body: {} }; },
    });
    await open(page);
    await page.locator('[data-action="reject"]').click();
    await page.locator('#reject-reason').fill('정원 초과');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-app-id="a1"] .badge')).toHaveText('반려');
    expect(calls.find((c) => c.path === 'admin/applications/a1/reject').body).toEqual({ reason: '정원 초과' });
  });

  test('방문 인증: 코드를 보내고, 실패하면 서버 메시지를 그대로 보여 준다', async ({ page }) => {
    let fail = true;
    const { calls } = await setup(page, {
      apps: [app({ id: 'a2', status: 'APPROVED', visitCode: 'K7M2ABCD12' })],
      onPost: (path, body, state) => {
        if (fail) return { status: 404, body: { message: '방문 코드가 일치하지 않습니다.' } };
        state.apps[0].status = 'VISITED'; return { status: 200, body: {} };
      },
    });
    await open(page);
    await page.locator('[data-action="verify-visit"]').click();
    await page.locator('#visit-code').fill('wrong');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.toast').first()).toContainText('방문 코드가 일치하지 않습니다');
    await expect(page.locator('dialog[open]')).toBeVisible();
    fail = false;
    await page.locator('#visit-code').fill('K7M2-ABCD-12');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-app-id="a2"] .badge')).toHaveText('방문 인증');
    expect(calls.filter((c) => c.path.endsWith('/verify-visit')).map((c) => c.body.code)).toEqual(['wrong', 'K7M2-ABCD-12']);
  });

  test('최종 승인: 점포와 차감 금액을 확인시키고, 잔액 부족(402) 메시지를 보여 준다', async ({ page }) => {
    const { calls } = await setup(page, {
      apps: [app({ id: 'a3', status: 'MISSION_SUBMITTED', feeAmount: 12000 })],
      onPost: () => ({ status: 402, body: { message: '적립금 잔액이 부족합니다.' } }),
    });
    await open(page);
    await page.locator('[data-action="complete"]').click();
    const dlg = page.locator('dialog[open]');
    await expect(dlg).toContainText('43번지 혼술바');
    await expect(dlg).toContainText('12,000원');
    await expect(dlg).toContainText('되돌릴 수 없습니다');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.toast').first()).toContainText('적립금 잔액이 부족합니다');
    await expect(page.locator('[data-app-id="a3"] .badge')).toHaveText('미션 제출');
    expect(calls.filter((c) => c.path.endsWith('/complete')).length).toBe(1);
  });

  test('보완 요청: 확인 후 요청하고 방문 인증 상태로 돌아간다', async ({ page }) => {
    const { calls } = await setup(page, {
      apps: [app({ id: 'a3', status: 'MISSION_SUBMITTED', missionUrl: 'https://instagram.com/p/x' })],
      onPost: (path, body, state) => { state.apps[0].status = 'VISITED'; return { status: 200, body: { status: 'VISITED' } }; },
    });
    await open(page);
    await page.locator('[data-action="request-revision"]').click();
    await expect(page.locator('dialog[open]')).toContainText('차감되지 않습니다');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-app-id="a3"] .badge')).toHaveText('방문 인증');
    await expect(page.locator('.toast.ok')).toContainText('보완을 요청했습니다');
    expect(calls.filter((c) => c.path === 'admin/applications/a3/request-revision').length).toBe(1);
  });

  test('노쇼: 확인 대화상자에서 취소하면 요청하지 않는다', async ({ page }) => {
    const { calls } = await setup(page, { apps: [app({ id: 'a2', status: 'APPROVED' })] });
    await open(page);
    await page.locator('[data-action="noshow"]').click();
    await page.locator('#dlg-cancel').click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    expect(calls.some((c) => c.path.endsWith('/noshow'))).toBe(false);
  });

  test('상태 필터는 서버에 status 를 보낸다', async ({ page }) => {
    const { calls } = await setup(page, { apps: full() });
    await open(page);
    await expect(page.locator('#app-list li')).toHaveCount(4);
    await page.locator('#filter-status').selectOption('APPROVED');
    await expect(page.locator('#app-list li')).toHaveCount(1);
    expect(calls.some((c) => c.path === 'admin/applications' && c.search.includes('status=APPROVED'))).toBe(true);
  });

  test('빈 목록은 안내 문구를 보여 준다', async ({ page }) => {
    await setup(page, { apps: [] });
    await open(page);
    await expect(page.locator('#empty')).toHaveText('조건에 맞는 신청이 없습니다.');
  });

  test('게스트 입력값은 HTML 로 해석되지 않고, http(s) 가 아닌 URL 은 링크가 되지 않는다', async ({ page }) => {
    await setup(page, {
      apps: [app({ status: 'MISSION_SUBMITTED', missionUrl: 'javascript:alert(1)', guest: { id: 'g', name: '<img src=x onerror="window.__xss=1">', phone: '010', noshowCount: 0, isBlocked: false } })],
    });
    await open(page);
    await expect(page.locator('[data-app-id="a1"]')).toContainText('<img src=x');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    await expect(page.locator('[data-app-id="a1"] a')).toHaveCount(0);
  });

  test('모바일(360px)에서 가로로 넘치지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await setup(page, { apps: full() });
    await open(page);
    await expect(page.locator('#app-list li')).toHaveCount(4);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('관리자 페이지 — 서비스 이름', () => {
  test('탭 제목과 헤더 로고에 HypeConnect 를 표시한다', async ({ page }) => {
    await setup(page, { apps: [] });
    await open(page);
    await expect(page).toHaveTitle('HypeConnect 관리자');
    // 헤더: HypeConnect 로고(이미지, alt 로 이름 제공) + 관리자
    await expect(page.locator('.topbar').getByRole('img', { name: 'HypeConnect' })).toBeVisible();
    await expect(page.locator('.topbar strong')).toHaveText('관리자');
  });
});
