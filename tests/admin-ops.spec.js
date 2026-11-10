import { test, expect } from './helpers/test-base.js';

// 관리자 페이지 — 대시보드·게스트 화면 테스트 (SDK 와 /admin/* API 를 mock, 실제 Supabase 호출 없음)

const PROJECT = 'https://admin-ops-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };
const FUTURE = '2099-01-01T00:00:00Z';

const SUMMARY = { pendingApplications: 3, openParties: 2, partiesThisWeek: 1, lowBalanceStores: 0, blockedGuests: 1, asOf: '2026-11-09T03:00:00Z' };
const guest = (o) => Object.assign({
  id: 'g1', name: '홍길동', phone: '010-1234-5678', email: null, instagram: null, followerCount: null,
  noshowCount: 0, penaltyCount: 0, isBlocked: false, blockedUntil: null, createdAt: '2026-11-01T00:00:00Z',
}, o);

async function setup(page, { summary = SUMMARY, summaryStatus = 200, guests = [guest()], failNext = null } = {}) {
  const calls = [];
  const db = { guests, summary };

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
  let summaryCalls = 0;
  await page.route(API + '**', async (route) => {
    const req = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const url = new URL(req.url());
    const path = url.pathname.replace('/functions/v1/partylink-api/', '');
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const m = req.method();
    calls.push({ method: m, path, search: url.search, body });
    const json = (status, b) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(b) });

    if (m === 'POST' && failNext && failNext.value) {
      const f = failNext.value; failNext.value = null;
      return json(f.status, { message: f.message });
    }
    if (path === 'admin/me') return json(200, { isAdmin: true, userId: 'u1' });
    if (path === 'admin/applications' || path === 'admin/parties' || path === 'admin/stores') return json(200, []);
    if (path === 'admin/summary') {
      summaryCalls += 1;
      if (summaryStatus !== 200 && summaryCalls === 1) return json(summaryStatus, { message: '일시적인 오류가 발생했습니다.' });
      return json(200, db.summary);
    }
    if (path === 'admin/guests' && m === 'GET') {
      const onlyBlocked = url.searchParams.get('blocked') === '1';
      const restricted = (g) => g.isBlocked || (g.blockedUntil && new Date(g.blockedUntil) > new Date());
      return json(200, onlyBlocked ? db.guests.filter(restricted) : db.guests);
    }
    const mm = path.match(/^admin\/guests\/([^/]+)\/block$/);
    if (mm && m === 'POST') {
      const g = db.guests.find((x) => x.id === mm[1]);
      if (body.blocked) g.isBlocked = true; else { g.isBlocked = false; g.blockedUntil = null; }
      return json(200, { id: g.id, isBlocked: g.isBlocked, blockedUntil: g.blockedUntil });
    }
    return json(404, { message: 'unexpected ' + m + ' ' + path });
  });
  return { calls, db };
}

const open = async (page, tab) => {
  await page.goto('/admin/?live=1');
  await expect(page.locator('#logout-btn')).toBeVisible();
  if (tab) await page.locator(`[data-nav="${tab}"]`).click();
};

test.describe('관리자 — 대시보드', () => {
  test('집계 숫자를 서버 값 그대로 보여 주고, 처리할 일이 있으면 강조한다', async ({ page }) => {
    await setup(page, { summary: Object.assign({}, SUMMARY, { lowBalanceStores: 2 }) });
    await open(page, 'dashboard');
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
    await expect(page.locator('[data-nav="dashboard"]')).toBeEnabled();
    const num = (k) => page.locator(`[data-tile="${k}"] .tile-num`);
    await expect(num('pendingApplications')).toHaveText('3');
    await expect(num('openParties')).toHaveText('2');
    await expect(num('partiesThisWeek')).toHaveText('1');
    await expect(num('lowBalanceStores')).toHaveText('2');
    await expect(num('blockedGuests')).toHaveText('1');
    await expect(page.locator('[data-tile="pendingApplications"]')).toHaveClass(/warn/);
    await expect(page.locator('[data-tile="lowBalanceStores"]')).toHaveClass(/warn/);
    await expect(page.locator('[data-tile="openParties"]')).not.toHaveClass(/warn/);
    // 서버는 점포 기본 수수료가 아니라 다가오는 파티의 인당 수수료 기준으로 센다
    await expect(page.locator('[data-tile="lowBalanceStores"]')).toContainText('다가오는 파티의 인당 수수료');
  });

  test('타일을 누르면 해당 화면으로 이동한다', async ({ page }) => {
    await setup(page);
    await open(page, 'dashboard');
    await page.locator('[data-tile="blockedGuests"]').click();
    await expect(page.getByRole('heading', { name: '게스트' })).toBeVisible();
    await expect(page.locator('[data-nav="guests"]')).toHaveAttribute('aria-current', 'page');
    await page.locator('[data-nav="dashboard"]').click();
    await page.locator('[data-tile="pendingApplications"]').click();
    await expect(page.getByRole('heading', { name: '신청 관리' })).toBeVisible();
  });

  test('서버 오류면 메시지와 다시 시도 버튼을 보여 주고, 재시도하면 불러온다', async ({ page }) => {
    await setup(page, { summaryStatus: 500 });
    await open(page, 'dashboard');
    await expect(page.locator('#content')).toContainText('일시적인 오류가 발생했습니다');
    await page.getByRole('button', { name: '다시 시도' }).click();
    await expect(page.locator('[data-tile="pendingApplications"] .tile-num')).toHaveText('3');
  });
});

test.describe('관리자 — 게스트', () => {
  const mixed = () => [
    guest({ id: 'g1', name: '홍길동', phone: '010-1234-5678' }),
    guest({ id: 'g2', name: '김철수', phone: '010-9999-8888', isBlocked: true, noshowCount: 3, penaltyCount: 5 }),
    guest({ id: 'g3', name: '이영희', phone: '010-5555-6666', blockedUntil: FUTURE, penaltyCount: 4 }),
    guest({ id: 'g4', name: '박민수', phone: '010-7777-0000', blockedUntil: '2020-01-01T00:00:00Z' }), // 이미 지난 제한
  ];

  test('상태별 배지와 버튼: 정상=차단, 차단됨/자동 제한=해제, 지난 제한은 정상', async ({ page }) => {
    await setup(page, { guests: mixed() });
    await open(page, 'guests');
    await expect(page.locator('#guest-list li')).toHaveCount(4);
    const badge = (id) => page.locator(`[data-guest-id="${id}"] .badge`);
    await expect(badge('g1')).toHaveText('정상');
    await expect(badge('g2')).toHaveText('차단됨');
    await expect(badge('g3')).toHaveText('자동 제한');
    await expect(badge('g4')).toHaveText('정상');
    const action = (id) => page.locator(`[data-guest-id="${id}"] [data-action]`).getAttribute('data-action');
    expect(await action('g1')).toBe('block');
    expect(await action('g2')).toBe('unblock');
    expect(await action('g3')).toBe('unblock');
    expect(await action('g4')).toBe('block');
    await expect(page.locator('[data-guest-id="g2"]')).toContainText('3회');
  });

  test('차단: 확인 후 blocked:true 를 보내고 상태가 바뀐다', async ({ page }) => {
    const { calls } = await setup(page);
    await open(page, 'guests');
    await page.locator('[data-action="block"]').click();
    await expect(page.locator('dialog[open]')).toContainText('새 파티에 신청할 수 없습니다');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-guest-id="g1"] .badge')).toHaveText('차단됨');
    await expect(page.locator('.toast.ok')).toContainText('차단했습니다');
    expect(calls.find((c) => c.path === 'admin/guests/g1/block').body).toEqual({ blocked: true });
  });

  test('해제: 자동 제한도 함께 풀린다고 안내하고, 해제하면 정상으로 돌아간다', async ({ page }) => {
    const { calls } = await setup(page, { guests: [guest({ id: 'g3', name: '이영희', blockedUntil: FUTURE })] });
    await open(page, 'guests');
    await page.locator('[data-action="unblock"]').click();
    await expect(page.locator('dialog[open]')).toContainText('자동 제한이 모두 풀려');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-guest-id="g3"] .badge')).toHaveText('정상');
    expect(calls.find((c) => c.path === 'admin/guests/g3/block').body).toEqual({ blocked: false });
  });

  test('취소하면 요청하지 않고, 서버가 거절하면 메시지를 보여 준다', async ({ page }) => {
    const failNext = { value: null };
    const { calls } = await setup(page, { failNext });
    await open(page, 'guests');
    await page.locator('[data-action="block"]').click();
    await page.locator('#dlg-cancel').click();
    await expect(page.locator('dialog')).toHaveCount(0);
    expect(calls.some((c) => c.path.endsWith('/block'))).toBe(false);

    failNext.value = { status: 404, message: '대상을 찾을 수 없습니다.' };
    await page.locator('[data-action="block"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('대상을 찾을 수 없습니다');
    await page.locator('#dlg-cancel').click();
    await expect(page.locator('[data-guest-id="g1"] .badge')).toHaveText('정상');
  });

  test('검색은 이름·연락처(하이픈 무시)로 걸러내고, 제한된 게스트만 보기는 서버에 blocked=1 을 보낸다', async ({ page }) => {
    const { calls } = await setup(page, { guests: mixed() });
    await open(page, 'guests');
    await expect(page.locator('#guest-list li')).toHaveCount(4);
    await page.locator('#guest-search').fill('김철');
    await expect(page.locator('#guest-list li')).toHaveCount(1);
    await page.locator('#guest-search').fill('01055556666');
    await expect(page.locator('#guest-list li')).toHaveCount(1);
    await expect(page.locator('#guest-list')).toContainText('이영희');
    await page.locator('#guest-search').fill('없는사람');
    await expect(page.locator('#empty-guests')).toBeVisible();
    await page.locator('#guest-search').fill('');
    await page.locator('#guest-blocked-only').check();
    await expect(page.locator('#guest-list li')).toHaveCount(2);
    expect(calls.some((c) => c.path === 'admin/guests' && c.search.includes('blocked=1'))).toBe(true);
  });

  test('게스트가 입력한 이름은 HTML 로 해석되지 않는다', async ({ page }) => {
    await setup(page, { guests: [guest({ name: '<img src=x onerror=window.__xss=1>' })] });
    await open(page, 'guests');
    await expect(page.locator('[data-guest-id="g1"] strong')).toHaveText('<img src=x onerror=window.__xss=1>');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('모바일(360px)에서 가로로 넘치지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await setup(page, { guests: mixed() });
    await open(page, 'guests');
    await expect(page.locator('#guest-list li')).toHaveCount(4);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
