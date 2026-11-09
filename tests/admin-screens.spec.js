import { test, expect } from '@playwright/test';

// 관리자 페이지 — 대시보드 / 파티 / 점포·적립금 / 게스트 화면.
// 실제 Supabase 를 호출하지 않고 SDK 와 /admin/* API 를 모두 mock 합니다. (tests/admin-page.spec.js 와 같은 방식, 독립 파일)

const PROJECT = 'https://admin-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const store = (o) => Object.assign({ id: 's1', name: '43번지 혼술바', ownerName: '홍길동', phone: '01012345678', address: '서울 중구', region: '명동/을지로', prepaidBalance: 5000, defaultFeePerGuest: 10000, isActive: true }, o);
const party = (o) => Object.assign({
  id: 'p1', storeId: 's1', storeName: '43번지 혼술바', region: '명동/을지로', title: '금요 혼술', description: '', benefit: '하이볼', category: '혼술바',
  images: [], badges: [], isFeatured: false, startsAt: '2026-11-13T10:00:00Z', endsAt: '2026-11-13T13:00:00Z', recruitDeadline: '2026-11-12T14:59:00Z',
  capacity: 6, feePerGuest: 10000, status: 'OPEN', selectedCount: 2, applicantCount: 5,
}, o);
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
    if (path === 'admin/applications') return json(200, []);
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

test.describe('관리자 — 파티', () => {
  const stores = () => ({ status: 200, body: [store(), store({ id: 's2', name: '비활성 바', isActive: false })] });

  test('목록: 인원·수수료를 보여 주고 상태에 맞는 버튼만 보인다', async ({ page }) => {
    await setup(page, { 'GET admin/parties': () => ({ status: 200, body: [party(), party({ id: 'p2', status: 'FINISHED', title: '지난 파티' })] }) });
    await open(page);
    await nav(page, 'parties');
    const open1 = page.locator('[data-party-id="p1"]');
    await expect(open1).toContainText('2 / 6명 선정');
    await expect(open1.locator('[data-move="CLOSED"]')).toBeVisible();
    await expect(open1.locator('[data-move="CANCELLED"]')).toBeVisible();
    const done = page.locator('[data-party-id="p2"]');
    await expect(done.locator('[data-move]')).toHaveCount(0);
    await expect(done.locator('[data-action="edit"]')).toHaveCount(0);
  });

  test('등록: 검증 오류는 요청 없이 보여 주고, 정상 입력은 KST 를 ISO 로 바꿔 보낸다', async ({ page }) => {
    const calls = await setup(page, {
      'GET admin/parties': () => ({ status: 200, body: [] }),
      'GET admin/stores': stores,
      'POST admin/parties': (b) => ({ status: 201, body: party({ id: 'p9', title: b.title }) }),
    });
    await open(page);
    await nav(page, 'parties');
    await page.locator('#party-new').click();
    await expect(page.locator('#pf-store option')).toHaveCount(1); // 비활성 점포는 제외
    await page.locator('#pf-title').fill('토요 파티');
    await page.locator('#pf-benefit').fill('맥주 1잔');
    await page.locator('#pf-capacity').fill('8');
    await page.locator('#pf-start').fill('2026-11-14T19:00');
    await page.locator('#pf-end').fill('2026-11-14T22:00');
    await page.locator('#pf-deadline').fill('2026-11-14T20:00');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toHaveText('모집 마감은 시작 이전이어야 합니다.');
    expect(writes(calls).length).toBe(0);

    await page.locator('#pf-deadline').fill('2026-11-13T23:00');
    await page.locator('#pf-badges').fill('NEW, 이벤트');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('dialog')).toHaveCount(0);
    const post = writes(calls)[0];
    expect(post.path).toBe('admin/parties');
    expect(post.body).toMatchObject({
      storeId: 's1', status: 'DRAFT', title: '토요 파티', capacity: 8, badges: ['NEW', '이벤트'],
      startsAt: '2026-11-14T10:00:00.000Z', endsAt: '2026-11-14T13:00:00.000Z', recruitDeadline: '2026-11-13T14:00:00.000Z',
    });
    expect('feePerGuest' in post.body).toBe(false); // 비우면 점포 기본 수수료
  });

  test('서버 오류(400)는 대화상자에 그대로 보여 주고 닫지 않는다', async ({ page }) => {
    await setup(page, {
      'GET admin/parties': () => ({ status: 200, body: [] }),
      'GET admin/stores': stores,
      'POST admin/parties': () => ({ status: 400, body: { message: '입력값을 확인해 주세요.' } }),
    });
    await open(page);
    await nav(page, 'parties');
    await page.locator('#party-new').click();
    await page.locator('#pf-title').fill('a');
    await page.locator('#pf-benefit').fill('b');
    await page.locator('#pf-capacity').fill('3');
    await page.locator('#pf-start').fill('2026-11-14T19:00');
    await page.locator('#pf-end').fill('2026-11-14T22:00');
    await page.locator('#pf-deadline').fill('2026-11-14T18:00');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toHaveText('입력값을 확인해 주세요.');
    await expect(page.locator('dialog')).toHaveCount(1);
  });

  test('상태 변경: 확인 후에만 PATCH, 취소하면 요청하지 않는다', async ({ page }) => {
    const calls = await setup(page, {
      'GET admin/parties': () => ({ status: 200, body: [party()] }),
      'PATCH admin/parties/p1': (b) => ({ status: 200, body: party({ status: b.status }) }),
    });
    await open(page);
    await nav(page, 'parties');
    await page.locator('[data-move="CANCELLED"]').click();
    await page.locator('#dlg-cancel').click();
    expect(writes(calls).length).toBe(0);
    await page.locator('[data-move="CLOSED"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('dialog')).toHaveCount(0);
    expect(writes(calls).map((c) => [c.method, c.path, c.body])).toEqual([['PATCH', 'admin/parties/p1', { status: 'CLOSED' }]]);
  });

  test('"신청 보기"는 해당 파티로 필터된 신청 목록을 연다', async ({ page }) => {
    const calls = await setup(page, { 'GET admin/parties': () => ({ status: 200, body: [party()] }) });
    await open(page);
    await nav(page, 'parties');
    await page.locator('[data-party-id="p1"] [data-action="applications"]').click();
    await expect(page.getByRole('heading', { name: '신청 관리' })).toBeVisible();
    expect(calls.some((c) => c.path === 'admin/applications' && c.search.includes('slotId=p1'))).toBe(true);
  });
});

test.describe('관리자 — 점포·적립금', () => {
  test('충전: 입금자명을 함께 보내고 잔액을 새로 불러온다', async ({ page }) => {
    let balance = 5000;
    const calls = await setup(page, {
      'GET admin/stores': () => ({ status: 200, body: [store({ prepaidBalance: balance })] }),
      'POST admin/stores/s1/charge': (b) => { balance += b.amount; return { status: 200, body: { balance_after: balance } }; },
    });
    await open(page);
    await nav(page, 'stores');
    await expect(page.locator('[data-store-id="s1"]')).toContainText('5,000원 (부족)');
    await page.locator('[data-store-id="s1"] [data-action="charge"]').click();
    await page.locator('#charge-amount').fill('300000');
    await page.locator('#dlg-confirm').click();
    // 입금자명이 비어 있으면 브라우저 필수 입력 검사가 막아 서버 요청도 닫힘도 일어나지 않는다
    await expect(page.locator('dialog')).toHaveCount(1);
    expect(writes(calls).length).toBe(0);
    await page.locator('#charge-depositor').fill('홍길동');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-store-id="s1"]')).toContainText('305,000원');
    expect(writes(calls)[0].body).toEqual({ amount: 300000, depositorName: '홍길동' });
  });

  test('환불: 잔액보다 크면 요청 없이 막고, 서버의 잔액 부족(402)은 그대로 보여 준다', async ({ page }) => {
    const calls = await setup(page, {
      'GET admin/stores': () => ({ status: 200, body: [store({ prepaidBalance: 50000 })] }),
      'POST admin/stores/s1/refund': () => ({ status: 402, body: { message: '적립금 잔액이 부족합니다.' } }),
    });
    await open(page);
    await nav(page, 'stores');
    await page.locator('[data-store-id="s1"] [data-action="refund"]').click();
    await page.locator('#refund-amount').fill('999999');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('현재 잔액(50,000원)보다 많이');
    expect(writes(calls).length).toBe(0);
    await page.locator('#refund-amount').fill('1000');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toHaveText('적립금 잔액이 부족합니다.');
  });

  test('원장: 거래 내역을 보여 준다', async ({ page }) => {
    await setup(page, {
      'GET admin/stores': () => ({ status: 200, body: [store()] }),
      'GET admin/stores/s1/deposits': () => ({ status: 200, body: [
        { id: 2, type: 'DEDUCT', amount: 10000, balanceAfter: 5000, createdAt: '2026-11-08T01:00:00Z' },
        { id: 1, type: 'CHARGE', amount: 15000, balanceAfter: 15000, depositorName: '홍길동', createdAt: '2026-11-07T01:00:00Z' },
      ] }),
    });
    await open(page);
    await nav(page, 'stores');
    await page.locator('[data-store-id="s1"] [data-action="ledger"]').click();
    await expect(page.locator('#ledger-list li')).toHaveCount(2);
    await expect(page.locator('#ledger-list')).toContainText('충전');
    await expect(page.locator('#ledger-list')).toContainText('-10,000원');
  });

  test('점포 등록: 사업자번호 중복(409) 메시지를 보여 주고, 성공하면 목록에 반영한다', async ({ page }) => {
    const list = [store()];
    const calls = await setup(page, {
      'GET admin/stores': () => ({ status: 200, body: list }),
      'POST admin/stores': (b) => {
        if (b.businessRegNo === '000-00-00000') return { status: 409, body: { message: '이미 등록된 정보입니다. (사업자번호 또는 점주 계정 중복)' } };
        list.unshift(store({ id: 's9', name: b.name })); return { status: 201, body: list[0] };
      },
    });
    await open(page);
    await nav(page, 'stores');
    await page.locator('#store-new').click();
    await page.locator('#sf-name').fill('신규 바');
    await page.locator('#sf-owner').fill('김');
    await page.locator('#sf-phone').fill('01011112222');
    await page.locator('#sf-address').fill('서울');
    await page.locator('#sf-brn').fill('000-00-00000');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('이미 등록된 정보');
    await page.locator('#sf-brn').fill('123-45-67890');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-store-id="s9"]')).toContainText('신규 바');
    expect(writes(calls).at(-1).body).toMatchObject({ businessRegNo: '123-45-67890', defaultFeePerGuest: 10000 });
    expect('prepaidBalance' in writes(calls).at(-1).body).toBe(false);
  });

  test('"잔액 부족만" 필터는 인당 수수료 미만 점포만 남긴다', async ({ page }) => {
    await setup(page, { 'GET admin/stores': () => ({ status: 200, body: [store(), store({ id: 's2', name: '넉넉한 바', prepaidBalance: 500000 })] }) });
    await open(page);
    await nav(page, 'stores');
    await expect(page.locator('#store-list .card')).toHaveCount(2);
    await page.locator('#store-low').check();
    await expect(page.locator('#store-list .card')).toHaveCount(1);
    await expect(page.locator('[data-store-id="s1"]')).toBeVisible();
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

test('모바일(360px)에서 파티 등록 폼이 가로로 넘치지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await setup(page, { 'GET admin/parties': () => ({ status: 200, body: [] }), 'GET admin/stores': () => ({ status: 200, body: [store()] }) });
  await open(page);
  await nav(page, 'parties');
  await page.locator('#party-new').click();
  await expect(page.locator('dialog')).toBeVisible();
  const over = await page.evaluate(() => {
    const d = document.querySelector('dialog');
    return document.documentElement.scrollWidth > window.innerWidth || d.scrollWidth > d.clientWidth;
  });
  expect(over).toBe(false);
});
