import { test, expect } from './helpers/test-base.js';

// Q-21 미션 검수 체크리스트가 관리자 "최종 승인" 다이얼로그에 실제로 표시되는지 검증한다.

const PROJECT = 'https://admin-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const app = (over) => Object.assign({
  id: 'a1', slotId: 's1', status: 'MISSION_SUBMITTED', visitCode: 'HC-7F3K9Q',
  missionUrl: 'https://blog.example.test/review', appliedAt: '2026-11-10T01:00:00Z',
  feeAmount: 10000, rejectReason: null, partyTitle: '금요 혼술', partyStartsAt: '2026-11-13T10:00:00Z',
  storeId: 'st1', storeName: '43번지 혼술바',
  guest: { id: 'g1', name: '홍길동', phone: '01012345678', noshowCount: 0, isBlocked: false },
}, over);

async function setup(page, { apps = [] } = {}) {
  await page.addInitScript((s) => { window.__SESSION = s; }, SESSION);
  await page.route('**/supabase.js', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.supabase = { createClient: function () { return { auth: {
      getSession: async function () { return { data: { session: window.__SESSION } }; },
      signInWithOAuth: async function () { return { error: null }; },
      signOut: async function () { window.__SESSION = null; return { error: null }; },
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
    const json = (status, body) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === 'admin/me') return json(200, { isAdmin: true, userId: 'u1' });
    if (path === 'admin/parties') return json(200, [{ id: 's1', title: '금요 혼술', startsAt: '2026-11-13T10:00:00Z', feePerGuest: 10000 }]);
    if (path === 'admin/applications') return json(200, apps);
    if (path === 'admin/stores') return json(200, []);
    return json(404, { message: 'unexpected ' + path });
  });
  await page.goto('/admin/?live=1');
}

test.describe('관리자 — Q-21 검수 체크리스트', () => {
  test('최종 승인 다이얼로그에 검수 체크리스트 4항목과 보완 2회 제한이 보인다', async ({ page }) => {
    await setup(page, { apps: [app()] });

    await page.locator('[data-nav="applications"]').click();
    const card = page.locator('[data-app-id="a1"]');
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.getByRole('button', { name: '최종 승인', exact: true }).click();

    const dlg = page.locator('.dlg');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByText('검수 체크리스트', { exact: true })).toBeVisible();
    await expect(dlg.getByText(/링크가 열리는가/)).toBeVisible();
    await expect(dlg.getByText(/해당 매장을 방문한 후기인가/)).toBeVisible();
    await expect(dlg.getByText(/사진 수·해시태그를 채웠는가/)).toBeVisible();
    await expect(dlg.getByText(/협찬 표시/)).toBeVisible();
    await expect(dlg.getByText(/보완 요청은 최대 2회/)).toBeVisible();
  });

  test('APPLIED 카드의 선정 버튼에는 체크리스트가 붙지 않는다', async ({ page }) => {
    await setup(page, { apps: [app({ status: 'APPLIED', missionUrl: null, visitCode: null })] });

    await page.locator('[data-nav="applications"]').click();
    const card = page.locator('[data-app-id="a1"]');
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.getByRole('button', { name: '선정', exact: true }).click();

    await expect(page.locator('.dlg').getByText('검수 체크리스트', { exact: true })).toHaveCount(0);
  });
});
