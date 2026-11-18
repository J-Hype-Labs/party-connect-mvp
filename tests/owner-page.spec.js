import { test, expect } from './helpers/test-base.js';

// 점주 화면(/owner/) 테스트.
// 실제 Supabase·계정·DB 를 호출하지 않고 SDK/공용 인증과 점주 API 를 모두 mock 한다.
//   - 미로그인: 로그인 화면(카카오 버튼·안내)만, API 호출 없음
//   - ownerApiEnabled=false: 어떤 함수도 요청 없이 { available:false } → 빈/준비 상태 안내
//   - 활성+mock: 로그인 후 "내 파티" 목록 + 신청자 표
// 기존 comprehensive/admin 테스트와 독립된 파일.

const PROJECT = 'https://owner-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'owner-token', user: { id: 'o1', user_metadata: { name: '김점주' } } };
const EMPTY = '아직 등록된 점주 계정이 아니거나, 서버 점주 API가 준비되지 않았습니다';

const party = (over) => Object.assign({ id: 'p1', storeId: 'st1', storeName: '지점 A', title: '금요 혼술', startsAt: '2026-11-13T10:00:00Z', status: 'OPEN' }, over);
const appRow = (over) => Object.assign({ id: 'ap1', partyId: 'p1', name: '홍길동', phone: '01012345678', status: 'APPLIED', appliedAt: '2026-11-10T01:00:00Z', visitCode: null, rejectReason: null }, over);

async function setup(page, { session = SESSION, apiEnabled = false, me, parties = [], apps = [] } = {}) {
  const calls = [];

  await page.addInitScript((s) => { window.__SESSION = s; window.__oauth = null; }, session);
  await page.route('**/supabase.js', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.supabase = { createClient: function () { return { auth: {
      getSession: async function () { return { data: { session: window.__SESSION } }; },
      signInWithOAuth: async function (o) { window.__oauth = o; return { error: null }; },
      signOut: async function () { window.__signedOut = true; window.__SESSION = null; return { error: null }; },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; }
    } }; } };`,
  }));
  await page.route('**/owner/?live=1', async (route) => {
    const res = await route.fetch();
    let html = (await res.text())
      .replace(/supabaseUrl: "[^"]*"/, 'supabaseUrl: "' + PROJECT + '"')
      .replace(/supabaseAnonKey: "[^"]*"/, 'supabaseAnonKey: "public-test-anon"');
    if (apiEnabled) html = html.replace('ownerApiEnabled: false', 'ownerApiEnabled: true');
    expect(html).toContain(PROJECT);
    expect(html).toContain('ownerApiEnabled: ' + String(apiEnabled));
    await route.fulfill({ response: res, body: html });
  });
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
  await page.route(API + '**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/functions/v1/partylink-api/', '');
    calls.push({ method: req.method(), path, search: url.search, body: req.postData() ? JSON.parse(req.postData()) : null, auth: req.headers()['authorization'] });
    const json = (status, body) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return json(204, null);
    if (path === 'me') return json(200, {});                       // 공용 인증의 온보딩 확인
    if (path === 'owner/me') { if (me) return json(me.status, me.body); return json(200, { owner: { id: 'o1', storeId: 'st1', displayName: '김점주' } }); }
    if (path === 'owner/parties') return json(200, { parties });
    if (path === 'owner/applications') return json(200, { applications: apps });
    return json(404, { message: 'unexpected ' + path });
  });
  return { calls };
}

const ownerCalls = (r) => (Array.isArray(r) ? r : (r && r.calls) || []).filter((c) => c.path.startsWith('owner/'));
const open = (page) => page.goto('/owner/?live=1');

test.describe('점주 페이지 — 로그인 전/인증', () => {
  test('미로그인이면 로그인 화면만 보이고 API 를 호출하지 않는다', async ({ page }) => {
    const { calls } = await setup(page, { session: null });
    await open(page);
    await expect(page.getByRole('heading', { name: '점주 로그인' })).toBeVisible();
    await expect(page.getByText('점주 계정은 운영팀이 먼저 등록합니다')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('#owner-empty')).toHaveCount(0);
    expect(calls).toEqual([]);
  });

  test('카카오 로그인은 공용 인증 재사용: 카카오 provider + 공용 콜백 + 복귀 경로 저장', async ({ page }) => {
    await setup(page, { session: null });
    await open(page);
    await page.locator('#login-btn').click();
    const oauth = await page.evaluate(() => window.__oauth);
    expect(oauth.provider).toBe('kakao');
    expect(new URL(oauth.options.redirectTo).pathname).toBe('/auth/callback/');
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('partylink:returnUrl')));
    expect(saved.returnPath).toBe('/owner/?live=1');
    expect(saved.intent).toBe('owner');
  });

  test('실서비스 모드가 아니면 설정 안내만 보인다', async ({ page }) => {
    await setup(page, { session: null });
    await page.goto('/owner/');
    await expect(page.getByRole('heading', { name: '실서비스 설정이 필요합니다' })).toBeVisible();
  });
});

test.describe('점주 페이지 — 점주 API 비활성(fail-closed)', () => {
  test('enabled=false 이면 요청 없이 "준비/빈 상태" 안내를 보여 준다', async ({ page }) => {
    const { calls, } = await setup(page, { apiEnabled: false });
    await open(page);
    // 로그인은 세션 복원만으로 성립(추가 요청 없음), 점주 조회는 전무해야 한다.
    await expect(page.getByRole('heading', { name: '내 파티' })).toBeVisible();
    await expect(page.getByText(EMPTY)).toBeVisible();
    await expect(page.getByText('오류가 아니라 준비 상태')).toBeVisible();
    expect(ownerCalls(calls)).toEqual([]);
  });

  test('각 함수는 비활성화 시 즉시 { available:false } — 네트워크 0', async ({ page }) => {
    const { calls } = await setup(page, { session: null, apiEnabled: false });
    await open(page);
    const out = await page.evaluate(async () => window.OwnerApi && {
      me: await window.OwnerApi.me(), parties: await window.OwnerApi.parties(),
      applications: await window.OwnerApi.applications('p1'), verifyVisit: await window.OwnerApi.verifyVisit('ap1', 'K7M2ABCD12'),
    });
    expect(out).toEqual({
      me: { available: false }, parties: { available: false },
      applications: { available: false }, verifyVisit: { available: false },
    });
    expect(calls).toEqual([]);
  });
});

test.describe('점주 페이지 — 점주 API 활성(mock)', () => {
  test('로그인 후 "내 파티" 목록 + 신청자 표(이름·연락처·상태·신청일)', async ({ page }) => {
    const { calls } = await setup(page, { apiEnabled: true, parties: [party()], apps: [appRow()] });
    await open(page);
    await expect(page.getByRole('heading', { name: '내 파티' })).toBeVisible();
    const partyBtn = page.getByRole('button', { name: /금요 혼술/ });
    await expect(partyBtn).toBeVisible();
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    await expect(table.getByText('홍길동')).toBeVisible();
    await expect(table.getByText('01012345678')).toBeVisible();
    await expect(table.getByRole('cell', { name: '신청', exact: true })).toBeVisible();
    await expect(table.getByRole('cell', { name: '11. 10. 10:00', exact: true })).toBeVisible();   // KST 포맷(월.일. 시각)
    const me = ownerCalls(calls).find((c) => c.path === 'owner/me');
    expect(me.auth).toBe('Bearer owner-token');
    const list = ownerCalls(calls).find((c) => c.path === 'owner/applications');
    expect(list.search).toContain('partyId=p1');
  });

  test('403 이면 권한 안내 + 다른 계정 로그인만 보인다', async ({ page }) => {
    const { calls } = await setup(page, { apiEnabled: true, me: { status: 403, body: { message: '이 계정은 점주로 등록되어 있지 않습니다.', code: 'NOT_OWNER' } } });
    await open(page);
    await expect(page.getByRole('heading', { name: '점주 권한이 없습니다' })).toBeVisible();
    await expect(page.getByText('이 계정은 점주로 등록되어 있지 않습니다.')).toBeVisible();
    await expect(page.locator('#owner-logout-btn')).toBeVisible();
    expect(ownerCalls(calls).map((c) => c.path)).toEqual(['owner/me']);
    await page.locator('#owner-logout-btn').click();
    await expect(page.getByRole('heading', { name: '점주 로그인' })).toBeVisible();
  });

  test('활성+성공이어도 파티가 비면 같은 빈 상태 안내를 보여준다', async ({ page }) => {
    const { calls } = await setup(page, { apiEnabled: true, parties: [], apps: [] });
    await open(page);
    await expect(page.getByRole('heading', { name: '내 파티' })).toBeVisible();
    await expect(page.getByText(EMPTY)).toBeVisible();
    expect(ownerCalls(calls).some((c) => c.path === 'owner/applications')).toBe(false);
  });
});

test.describe('점주 페이지 — 레이아웃', () => {
  test('320px·1440px 에서 가로 넘침이 없다', async ({ page }) => {
    await setup(page, { apiEnabled: true, parties: [party()], apps: [appRow()] });
    for (const vp of [{ width: 320, height: 740 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(vp);
      await open(page);
      await expect(page.getByRole('table')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });
});
