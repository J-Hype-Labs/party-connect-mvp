import { test, expect } from './helpers/test-base.js';

// 관리자 페이지 — 파티·점포/적립금 화면 기능 강화 테스트
// 기존 tests/admin-catalog.spec.js의 픽스처 패턴을 그대로 따른다.

const PROJECT = 'https://admin-catalog-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const store = (o) => Object.assign({
  id: 'st1', name: '43번지 혼술바', ownerName: '김사장', phone: '01011112222', address: '서울 강남구 1', region: '강남',
  prepaidBalance: 50000, defaultFeePerGuest: 10000, isActive: true, createdAt: '2026-11-01T00:00:00Z',
}, o);

const party = (o) => Object.assign({
  id: 'p1', storeId: 'st1', storeName: '43번지 혼술바', region: '강남', title: '금요 혼술', description: null, benefit: '1+1',
  category: '혼술바', images: ['https://example.com/img.jpg'], badges: ['신규', '인기'], isFeatured: false,
  startsAt: '2026-11-13T10:00:00Z', endsAt: '2026-11-13T13:00:00Z',
  recruitDeadline: '2026-11-12T10:00:00Z', capacity: 6, feePerGuest: 10000, status: 'DRAFT',
  missionRequirements: '체험단으로 혜택을 제공받아 작성했습니다. (협찬 표시)',
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

test.describe('관리자 — 파티 기능 강화 (F0-4, F0-5, F0-6)', () => {
  test('점포 폼: 지역 select가 정규 목록을 제공하고, 레거시 값(예: 강남)은 추가 옵션으로 보존된다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store({ region: '강남' })] });
    await open(page, 'stores');

    // 기존 점포 수정: 지역 select가 나타나고 레거시 값 '강남'이 옵션에 포함돼 있어야 함
    await page.locator('[data-action="edit"]').click();
    const regionSelect = page.locator('#sf-region');
    await expect(regionSelect).toBeVisible();
    const options = await regionSelect.locator('option').allTextContents();
    // 정규 목록의 첫 몇 개와 레거시 값 확인
    expect(options).toContain('지역 선택');
    expect(options).toContain('강남/서초');
    expect(options).toContain('홍대/마포');
    expect(options).toContain('강남 (레거시)'); // 레거시 값 보존
    // 현재 선택값이 '강남 (레거시)'여야 함
    await expect(regionSelect).toHaveValue('강남');

    // 저장 시 region이 payload에 포함됨
    await page.locator('#dlg-confirm').click();
    const patch = calls.find((c) => c.method === 'PATCH' && c.path === 'admin/stores/st1');
    expect(patch.body.region).toBe('강남');
  });

  test('점포 폼: 신규 등록 시 지역 select에 빈 옵션(지역 선택)이 있고 선택 가능', async ({ page }) => {
    const { calls } = await setup(page, { stores: [] });
    await open(page, 'stores');
    await page.locator('#new-store').click();
    const regionSelect = page.locator('#sf-region');
    await expect(regionSelect).toBeVisible();
    const options = await regionSelect.locator('option').allTextContents();
    expect(options).toContain('지역 선택');
    expect(options).toContain('강남/서초');
    // 빈 값 허용: '지역 선택'이 기본 선택돼 있어야 함
    await expect(regionSelect).toHaveValue('');
  });

  test('파티 폼: 이미지·배지·미션 조건 입력 시 payload에 포함되고, 비우면 제외된다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store()], parties: [party()] });
    await open(page, 'parties');
    await page.locator('[data-party-id="p1"] [data-action="edit"]').click();

    // 기존 값이 프리필됨
    await expect(page.locator('#pf-image')).toHaveValue('https://example.com/img.jpg');
    await expect(page.locator('#pf-badges')).toHaveValue('신규, 인기');
    await expect(page.locator('#pf-mission')).toHaveValue('체험단으로 혜택을 제공받아 작성했습니다. (협찬 표시)');

    // 값 변경 후 저장
    await page.locator('#pf-image').fill('https://new.example.com/cover.jpg');
    await page.locator('#pf-badges').fill('신규, 한정, 인기');
    await page.locator('#pf-mission').fill('새로운 미션 조건입니다.');
    await page.locator('#dlg-confirm').click();

    const patch = calls.find((c) => c.method === 'PATCH' && c.path === 'admin/parties/p1');
    expect(patch.body.images).toEqual(['https://new.example.com/cover.jpg']);
    expect(patch.body.badges).toEqual(['신규', '한정', '인기']);
    expect(patch.body.missionRequirements).toBe('새로운 미션 조건입니다.');
  });

  test('파티 폼: 이미지·배지·미션 조건을 비우면 payload에서 제외된다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store()], parties: [party()] });
    await open(page, 'parties');
    await page.locator('[data-party-id="p1"] [data-action="edit"]').click();

    // 모두 비우기
    await page.locator('#pf-image').fill('');
    await page.locator('#pf-badges').fill('');
    await page.locator('#pf-mission').fill('');
    await page.locator('#dlg-confirm').click();

    const patch = calls.find((c) => c.method === 'PATCH' && c.path === 'admin/parties/p1');
    expect('images' in patch.body).toBe(false);
    expect('badges' in patch.body).toBe(false);
    expect('missionRequirements' in patch.body).toBe(false);
  });

  test('파티 복제: 복제 버튼으로 생성 폼이 열리고, 필드 프리필·날짜 비움·상태 DRAFT·점포 선택됨', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store()], parties: [party({ id: 'p1', title: '원본 파티', capacity: 8, category: '소셜파티' })] });
    await open(page, 'parties');
    await page.locator('[data-party-id="p1"] [data-action="duplicate"]').click();

    // 다이얼로그 타이틀이 '파티 복제'여야 함
    await expect(page.locator('dialog h2')).toContainText('파티 복제');
    // 확인 버튼은 '등록'
    await expect(page.locator('#dlg-confirm')).toHaveText('등록');

    // 필드 프리필 확인
    await expect(page.locator('#pf-title')).toHaveValue('원본 파티');
    await expect(page.locator('#pf-benefit')).toHaveValue('1+1');
    await expect(page.locator('#pf-category')).toHaveValue('소셜파티');
    await expect(page.locator('#pf-capacity')).toHaveValue('8');
    await expect(page.locator('#pf-fee')).toHaveValue('10000');
    await expect(page.locator('#pf-featured')).not.toBeChecked();
    await expect(page.locator('#pf-image')).toHaveValue('https://example.com/img.jpg');
    await expect(page.locator('#pf-badges')).toHaveValue('신규, 인기');
    await expect(page.locator('#pf-mission')).toHaveValue('체험단으로 혜택을 제공받아 작성했습니다. (협찬 표시)');
    // 점포가 선택돼 있어야 함
    await expect(page.locator('#pf-store')).toHaveValue('st1');
    // 날짜는 비워져 있어야 함 (필수 필드라 브라우저가 빈 값 표시)
    await expect(page.locator('#pf-starts')).toHaveValue('');
    await expect(page.locator('#pf-ends')).toHaveValue('');
    await expect(page.locator('#pf-deadline')).toHaveValue('');
    // 상태는 DRAFT
    await expect(page.locator('#pf-status')).toHaveValue('DRAFT');
  });

  test('파티 복제: 날짜를 채우지 않고 제출하면 검증 에러, 모두 채우면 POST 새 파티로 제출', async ({ page }) => {
    const { calls, db } = await setup(page, { stores: [store()], parties: [party({ id: 'p1', title: '원본', capacity: 5 })] });
    await open(page, 'parties');
    await page.locator('[data-party-id="p1"] [data-action="duplicate"]').click();

    // 날짜 안 채우고 제출 -> 필수 필드 브라우저 검증이 막아 POST가 가지 않음
    await page.locator('#dlg-confirm').click();
    expect(calls.some((c) => c.method === 'POST' && c.path === 'admin/parties')).toBe(false);

    // 날짜 채우고 제출
    await page.locator('#pf-starts').fill('2026-12-01T19:00');
    await page.locator('#pf-ends').fill('2026-12-01T22:00');
    await page.locator('#pf-deadline').fill('2026-11-30T18:00');
    await page.locator('#dlg-confirm').click();

    // POST로 새 파티 생성됨
    const post = calls.find((c) => c.method === 'POST' && c.path === 'admin/parties');
    expect(post.body).toMatchObject({
      storeId: 'st1', title: '원본', benefit: '1+1', category: '혼술바', capacity: 5, status: 'DRAFT',
      isFeatured: false,
      images: ['https://example.com/img.jpg'],
      badges: ['신규', '인기'],
      missionRequirements: '체험단으로 혜택을 제공받아 작성했습니다. (협찬 표시)',
    });
    expect(post.body.startsAt).toBe('2026-12-01T10:00:00.000Z');
    expect(post.body.endsAt).toBe('2026-12-01T13:00:00.000Z');
    expect(post.body.recruitDeadline).toBe('2026-11-30T09:00:00.000Z');
    // 클라이언트는 id를 보내지 않음 — 서버(목)가 새 id를 부여한다
    expect(post.body.id).toBeUndefined();
    const created = db.parties.find((p) => p.id !== 'p1');
    expect(created).toBeTruthy();
    expect(created.id).toMatch(/^p\d+$/);
  });

  test('신규 파티 등록: 미션 조건 기본값이 협찬 표시 문구로 프리필된다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store()] });
    await open(page, 'parties');
    await page.locator('#new-party').click();

    await expect(page.locator('#pf-mission')).toHaveValue('체험단으로 혜택을 제공받아 작성했습니다. (협찬 표시)');
    // 다른 필드는 비어있음
    await expect(page.locator('#pf-image')).toHaveValue('');
    await expect(page.locator('#pf-badges')).toHaveValue('');

    // 기본값 그대로 두고 필수 필드만 채워 등록
    await page.locator('#pf-store').selectOption('st1');
    await page.locator('#pf-title').fill('신규 파티');
    await page.locator('#pf-benefit').fill('혜택');
    await page.locator('#pf-starts').fill('2026-12-01T19:00');
    await page.locator('#pf-ends').fill('2026-12-01T22:00');
    await page.locator('#pf-deadline').fill('2026-11-30T18:00');
    await page.locator('#pf-capacity').fill('4');
    await page.locator('#dlg-confirm').click();

    const post = calls.find((c) => c.method === 'POST' && c.path === 'admin/parties');
    expect(post.body.missionRequirements).toBe('체험단으로 혜택을 제공받아 작성했습니다. (협찬 표시)');
  });

  test('신규 파티 등록: 미션 조건을 비우면 payload에서 제외된다', async ({ page }) => {
    const { calls } = await setup(page, { stores: [store()] });
    await open(page, 'parties');
    await page.locator('#new-party').click();

    // 미션 조건 비우기
    await page.locator('#pf-mission').fill('');
    await page.locator('#pf-store').selectOption('st1');
    await page.locator('#pf-title').fill('신규 파티');
    await page.locator('#pf-benefit').fill('혜택');
    await page.locator('#pf-starts').fill('2026-12-01T19:00');
    await page.locator('#pf-ends').fill('2026-12-01T22:00');
    await page.locator('#pf-deadline').fill('2026-11-30T18:00');
    await page.locator('#pf-capacity').fill('4');
    await page.locator('#dlg-confirm').click();

    const post = calls.find((c) => c.method === 'POST' && c.path === 'admin/parties');
    expect('missionRequirements' in post.body).toBe(false);
  });
});