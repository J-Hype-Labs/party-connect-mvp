import { test, expect } from './helpers/test-base.js';

// 관리자 페이지 — 파티·점포/적립금 화면 테스트.
// 실제 Supabase/DB 를 호출하지 않고 SDK 와 /admin/* API 를 메모리 서버로 mock 합니다.

const PROJECT = 'https://admin-catalog-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const store = (o) => Object.assign({
  id: 'st1', name: '43번지 혼술바', ownerName: '김사장', phone: '01011112222', address: '서울 강남구 1', region: '강남',
  prepaidBalance: 50000, defaultFeePerGuest: 10000, isActive: true, createdAt: '2026-11-01T00:00:00Z',
}, o);
const party = (o) => Object.assign({
  id: 'p1', storeId: 'st1', storeName: '43번지 혼술바', region: '강남', title: '금요 혼술', description: null, benefit: '1+1',
  category: '혼술바', images: [], badges: [], isFeatured: false, startsAt: '2026-11-13T10:00:00Z', endsAt: '2026-11-13T13:00:00Z',
  recruitDeadline: '2026-11-12T10:00:00Z', capacity: 6, feePerGuest: 10000, status: 'DRAFT', missionRequirements: {},
  createdAt: '2026-11-05T00:00:00Z', selectedCount: 0, applicantCount: 0,
}, o);

async function setup(page, { stores = [store()], parties = [], failNext = null, applications = [], appsFail = false } = {}) {
  const calls = [];
  const db = { stores, parties, deposits: [], applications };
  let seq = 100;

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
    const m = req.method();
    calls.push({ method: m, path, body });
    const json = (status, b) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(b) });

    if (m !== 'GET' && failNext && failNext.value) {
      const f = failNext.value; failNext.value = null;
      return json(f.status, { message: f.message });
    }
    if (path === 'admin/me') return json(200, { isAdmin: true, userId: 'u1' });
    if (path === 'admin/applications') return appsFail ? json(500, { message: '일시적인 오류가 발생했습니다.' }) : json(200, db.applications);
    if (path === 'admin/stores' && m === 'GET') return json(200, db.stores);
    if (path === 'admin/stores' && m === 'POST') {
      const s = store({ id: 'st' + (++seq), name: body.name, ownerName: body.ownerName, phone: body.phone, address: body.address, region: body.region || null, prepaidBalance: 0, defaultFeePerGuest: body.defaultFeePerGuest || 0 });
      db.stores.push(s); return json(201, s);
    }
    let mm = path.match(/^admin\/stores\/([^/]+)$/);
    if (mm && m === 'PATCH') {
      const s = db.stores.find((x) => x.id === mm[1]);
      Object.assign(s, body.isActive !== undefined ? { isActive: body.isActive } : {}, body.name ? { name: body.name } : {});
      return json(200, s);
    }
    mm = path.match(/^admin\/stores\/([^/]+)\/(charge|refund|deposits)$/);
    if (mm && mm[2] === 'deposits') return json(200, db.deposits);
    if (mm && m === 'POST') {
      const s = db.stores.find((x) => x.id === mm[1]);
      const before = s.prepaidBalance;
      s.prepaidBalance += mm[2] === 'charge' ? body.amount : -body.amount;
      db.deposits.unshift({ id: seq++, type: mm[2] === 'charge' ? 'CHARGE' : 'REFUND', amount: body.amount, balanceBefore: before, balanceAfter: s.prepaidBalance, depositorName: body.depositorName || null, memo: body.memo || null, createdAt: '2026-11-09T01:00:00Z' });
      return json(200, { balance: s.prepaidBalance });
    }
    if (path === 'admin/parties' && m === 'GET') {
      const st = url.searchParams.get('status');
      return json(200, st ? db.parties.filter((p) => p.status === st) : db.parties);
    }
    if (path === 'admin/parties' && m === 'POST') {
      const s = db.stores.find((x) => x.id === body.storeId);
      const p = party(Object.assign({}, body, { id: 'p' + (++seq), storeName: s.name, feePerGuest: body.feePerGuest === undefined ? s.defaultFeePerGuest : body.feePerGuest }));
      db.parties.push(p); return json(201, p);
    }
    mm = path.match(/^admin\/parties\/([^/]+)$/);
    if (mm && m === 'PATCH') {
      const p = db.parties.find((x) => x.id === mm[1]);
      Object.assign(p, body); return json(200, p);
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

test.describe('관리자 — 파티', () => {
  test('내비게이션에서 파티·점포 탭이 열린다 (준비 중 표시 없음)', async ({ page }) => {
    await setup(page);
    await open(page);
    await expect(page.locator('[data-nav="parties"]')).toBeEnabled();
    await expect(page.locator('[data-nav="stores"]')).toBeEnabled();
    await expect(page.locator('[data-nav="parties"]')).not.toContainText('준비 중');
    await page.locator('[data-nav="parties"]').click();
    await expect(page.getByRole('heading', { name: '파티 관리' })).toBeVisible();
    await expect(page.locator('[data-nav="parties"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#empty-parties')).toBeVisible();
  });

  test('새 파티 등록: 한국 시간을 UTC ISO 로 바꿔 보내고 목록에 나타난다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store(), store({ id: 'st2', name: '중지된 점포', isActive: false })] });
    await open(page, 'parties');
    await page.locator('#new-party').click();
    await expect(page.locator('#pf-store option')).toHaveText(['점포 선택', '43번지 혼술바']); // 운영 중지 점포는 제외
    await page.locator('#pf-store').selectOption('st1');
    await page.locator('#pf-title').fill('토요 소셜');
    await page.locator('#pf-benefit').fill('웰컴 드링크');
    await page.locator('#pf-category').selectOption('소셜파티');
    await page.locator('#pf-starts').fill('2026-11-21T19:00');
    await page.locator('#pf-ends').fill('2026-11-21T22:00');
    await page.locator('#pf-deadline').fill('2026-11-20T18:00');
    await page.locator('#pf-capacity').fill('8');
    await page.locator('#pf-status').selectOption('OPEN');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('#party-list li')).toHaveCount(1);
    await expect(page.locator('#party-list .badge')).toHaveText('모집 중');
    const post = calls.find((c) => c.method === 'POST' && c.path === 'admin/parties');
    expect(post.body).toMatchObject({
      storeId: 'st1', title: '토요 소셜', benefit: '웰컴 드링크', category: '소셜파티', capacity: 8, status: 'OPEN',
      startsAt: '2026-11-21T10:00:00.000Z', endsAt: '2026-11-21T13:00:00.000Z', recruitDeadline: '2026-11-20T09:00:00.000Z',
    });
    expect(post.body.feePerGuest).toBeUndefined(); // 비우면 점포 기본 수수료
  });

  test('시간 순서가 틀리면 요청하지 않고 안내한다', async ({ page }) => {
    const { calls } = await setup(page);
    await open(page, 'parties');
    await page.locator('#new-party').click();
    await page.locator('#pf-store').selectOption('st1');
    await page.locator('#pf-title').fill('x');
    await page.locator('#pf-benefit').fill('y');
    await page.locator('#pf-starts').fill('2026-11-21T19:00');
    await page.locator('#pf-ends').fill('2026-11-21T18:00');
    await page.locator('#pf-deadline').fill('2026-11-20T18:00');
    await page.locator('#pf-capacity').fill('4');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('종료 시각');
    expect(calls.some((c) => c.method === 'POST' && c.path === 'admin/parties')).toBe(false);
  });

  test('수정: 한국 시간으로 채워 보여 주고, 점포는 보내지 않는다', async ({ page }) => {
    const { calls } = await setup(page, { parties: [party()] });
    await open(page, 'parties');
    await page.locator('[data-party-id="p1"] [data-action="edit"]').click();
    await expect(page.locator('#pf-starts')).toHaveValue('2026-11-13T19:00');
    await expect(page.locator('#pf-store')).toHaveCount(0);
    await page.locator('#pf-capacity').fill('10');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-party-id="p1"]')).toContainText('/ 10');
    const patch = calls.find((c) => c.method === 'PATCH' && c.path === 'admin/parties/p1');
    expect(patch.body.capacity).toBe(10);
    expect('storeId' in patch.body).toBe(false);
    expect('status' in patch.body).toBe(false);
  });

  test('상태 전환: 공개 → 모집 마감, 서버가 거절하면 메시지를 보여 주고 상태는 그대로', async ({ page }) => {
    const failNext = { value: null };
    const { calls } = await setup(page, { parties: [party()], failNext });
    await open(page, 'parties');
    await expect(page.locator('[data-party-id="p1"]')).toBeVisible(); // 목록이 로드된 뒤에 읽는다
    const actions = () => page.locator('[data-party-id="p1"] [data-action]').evaluateAll((els) => els.map((e) => e.dataset.action));
    expect(await actions()).toEqual(['edit', 'to-OPEN', 'to-CANCELLED']);

    failNext.value = { status: 409, message: '이미 처리된 파티입니다.' };
    await page.locator('[data-action="to-OPEN"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('이미 처리된 파티입니다');
    await page.locator('#dlg-cancel').click();
    await expect(page.locator('dialog')).toHaveCount(0); // 이전 대화상자가 사라진 뒤에 다음 단계로
    await expect(page.locator('[data-party-id="p1"] .badge')).toHaveText('작성 중');

    await page.locator('[data-action="to-OPEN"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-party-id="p1"] .badge')).toHaveText('모집 중');
    expect(await actions()).toEqual(['edit', 'to-CLOSED', 'to-CANCELLED']);
    expect(calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([{ status: 'OPEN' }, { status: 'OPEN' }]);
  });

  test('상태 필터는 서버에 status 를 보낸다', async ({ page }) => {
    await setup(page, { parties: [party(), party({ id: 'p2', title: '마감됨', status: 'CLOSED' })] });
    await open(page, 'parties');
    await expect(page.locator('#party-list li')).toHaveCount(2);
    await page.locator('#filter-party-status').selectOption('CLOSED');
    await expect(page.locator('#party-list li')).toHaveCount(1);
    await expect(page.locator('#party-list')).toContainText('마감됨');
  });
});

test.describe('관리자 — 점포·적립금', () => {
  test('새 점포 등록: 사업자번호 형식을 검사하고, 통과하면 보낸다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [] });
    await open(page, 'stores');
    await expect(page.locator('#empty-stores')).toBeVisible();
    await page.locator('#new-store').click();
    await page.locator('#sf-name').fill('새 바');
    await page.locator('#sf-owner').fill('박사장');
    await page.locator('#sf-phone').fill('01099990000');
    await page.locator('#sf-brn').fill('1234567890');
    await page.locator('#sf-address').fill('서울 마포구 2');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('사업자등록번호');
    expect(calls.some((c) => c.method === 'POST' && c.path === 'admin/stores')).toBe(false);

    await page.locator('#sf-brn').fill('123-45-67890');
    await page.locator('#sf-fee').fill('12000');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('#store-list li')).toHaveCount(1);
    const post = calls.find((c) => c.method === 'POST' && c.path === 'admin/stores');
    expect(post.body).toMatchObject({ name: '새 바', ownerName: '박사장', phone: '01099990000', businessRegNo: '123-45-67890', address: '서울 마포구 2', defaultFeePerGuest: 12000 });
  });

  test('충전: 금액·입금자명을 보내고 잔액과 내역에 반영된다', async ({ page }) => {
    const { calls } = await setup(page);
    await open(page, 'stores');
    await expect(page.locator('[data-store-id="st1"]')).toContainText('50,000원');
    await page.locator('[data-action="charge"]').click();
    await page.locator('#md-amount').fill('30000');
    await page.locator('#dlg-confirm').click();
    // 입금자명은 필수: 브라우저 검증이 막아서 요청이 가지 않는다
    await expect(page.locator('#md-depositor')).toBeFocused();
    expect(calls.some((c) => c.path.endsWith('/charge'))).toBe(false);
    await page.locator('#md-depositor').fill('김사장');
    await page.locator('#md-memo').fill('11월 입금');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-store-id="st1"]')).toContainText('80,000원');
    expect(calls.find((c) => c.path === 'admin/stores/st1/charge').body).toEqual({ amount: 30000, depositorName: '김사장', memo: '11월 입금' });

    await page.locator('[data-action="history"]').click();
    const hist = page.locator('#deposit-history li');
    await expect(hist).toHaveCount(1);
    await expect(hist.first()).toContainText('충전');
    await expect(hist.first()).toContainText('잔액 80,000원');
  });

  test('환불: 잔액보다 크면 요청하지 않는다', async ({ page }) => {
    const { calls } = await setup(page);
    await open(page, 'stores');
    await page.locator('[data-action="refund"]').click();
    await page.locator('#md-amount').fill('60000');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('.dlg-err')).toContainText('현재 적립금보다 큽니다');
    expect(calls.some((c) => c.path.endsWith('/refund'))).toBe(false);
    await page.locator('#md-amount').fill('20000');
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-store-id="st1"]')).toContainText('30,000원');
  });

  test('운영 중지: 확인 후 PATCH, 배지가 바뀐다', async ({ page }) => {
    const { calls } = await setup(page);
    await open(page, 'stores');
    await page.locator('[data-action="toggle"]').click();
    await page.locator('#dlg-confirm').click();
    await expect(page.locator('[data-store-id="st1"] .badge')).toHaveText('운영 중지');
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ isActive: false });
  });

  test.describe('업체별 수수료 집계', () => {
    const NOW = new Date();
    const thisMonthIso = new Date(NOW.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 7);
    const thisMonthDay = thisMonthIso + '-02T03:00:00Z';
    const app = (o) => Object.assign({ id: 'x', status: 'COMPLETED', storeId: 'st1', storeName: '43번지 혼술바', feeAmount: 10000, visitedAt: null, completedAt: null, noshowAt: null }, o);
    const apps = () => [
      app({ id: 'a1', visitedAt: thisMonthDay, completedAt: thisMonthDay, feeAmount: 10000 }),
      app({ id: 'a2', visitedAt: thisMonthDay, completedAt: thisMonthDay, feeAmount: 12000 }),
      app({ id: 'a3', status: 'VISITED', visitedAt: thisMonthDay, feeAmount: 10000 }), // 방문만, 아직 차감 없음
      app({ id: 'a4', status: 'NOSHOW', noshowAt: thisMonthDay }),
      app({ id: 'a5', visitedAt: '2020-01-05T03:00:00Z', completedAt: '2020-01-05T05:00:00Z', feeAmount: 99999 }), // 오래된 달
      app({ id: 'a6', storeId: 'st2', storeName: '다른 점포', visitedAt: thisMonthDay, completedAt: thisMonthDay, feeAmount: 5000 }),
      app({ id: 'a7', status: 'APPLIED' }), // 아직 신청만
    ];

    test('점포별 방문·완료·노쇼 건수와 차감 합계를 센다 (기본은 전체 기간)', async ({ page }) => {
      await setup(page, { stores: [store(), store({ id: 'st2', name: '다른 점포' })], applications: apps() });
      await open(page, 'stores');
      const row = (id) => page.locator(`[data-fee-store="${id}"] td`).allTextContents();
      await expect(page.locator('#fee-summary')).toBeVisible();
      // 전체 기간: st1 방문 3(a1,a2,a3)+오래된 a5=4, 완료 3, 노쇼 1, 차감 10000+12000+99999
      expect(await row('st1')).toEqual(['4', '3', '1', '121,999원']);
      expect(await row('st2')).toEqual(['1', '1', '0', '5,000원']);
      expect(await page.locator('[data-fee-store="total"] > *').allTextContents()).toEqual(['합계', '5', '4', '1', '126,999원']);
    });

    test('월을 고르면 그 달에 일어난 건만 센다 (각 건은 자기 시각의 달로 분류)', async ({ page }) => {
      await setup(page, { stores: [store(), store({ id: 'st2', name: '다른 점포' })], applications: apps() });
      await open(page, 'stores');
      await page.locator('#fee-month').selectOption(thisMonthIso);
      const row = (id) => page.locator(`[data-fee-store="${id}"] td`).allTextContents();
      expect(await row('st1')).toEqual(['3', '2', '1', '22,000원']); // 오래된 a5 제외
      expect(await page.locator('[data-fee-store="total"] > *').allTextContents()).toEqual(['합계', '4', '3', '1', '27,000원']);
      await page.locator('#fee-month').selectOption({ index: 6 }); // 5개월 전: 기록 없음
      await expect(page.locator('#fee-empty')).toBeVisible();
    });

    test('집계 요청이 실패해도 점포 목록은 그대로 쓸 수 있다', async ({ page }) => {
      await setup(page, { appsFail: true });
      await open(page, 'stores');
      await expect(page.locator('#fee-failed')).toContainText('일시적인 오류');
      await expect(page.locator('#store-list li')).toHaveCount(1);
    });

    test('자동 청구가 아니라 수동 정산용임을 안내한다', async ({ page }) => {
      await setup(page, { applications: apps() });
      await open(page, 'stores');
      await expect(page.locator('#fee-summary')).toContainText('수동으로 진행');
      await expect(page.locator('#fee-summary')).toContainText('자동 청구는 하지 않습니다');
    });
  });

  test('화면을 오가도 이전 화면의 늦은 응답이 덮어쓰지 않는다', async ({ page }) => {
    await setup(page, { parties: [party()] });
    await open(page, 'parties');
    await page.locator('[data-nav="stores"]').click();
    await expect(page.getByRole('heading', { name: '점포·적립금' })).toBeVisible();
    await page.locator('[data-nav="applications"]').click();
    await expect(page.getByRole('heading', { name: '신청 관리' })).toBeVisible();
    await expect(page.locator('#store-list')).toHaveCount(0);
    await expect(page.locator('#party-list')).toHaveCount(0);
  });
});
