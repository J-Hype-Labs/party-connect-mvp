import { test, expect } from './helpers/test-base.js';
import { loadLive } from './helpers/live-fixture.js';

test.describe('HypeConnect Page - Dedicated Party Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/party-connect/');
    await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });
  });

  test('should load party-connect page with h1', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    // 페이지의 h1 은 "원하는 파티를 찾아 신청하세요", "HypeConnect"는 로고/섹션 제목(h2)이다.
    await expect(page.locator('h1:has-text("원하는 파티")')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'HypeConnect' })).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="파티명"]')).toBeVisible();
  });

  test('should have day filter chips', async ({ page }) => {
    const dayButtons = ['전체', '월', '화', '수', '목', '금', '토', '일'];
    for (const day of dayButtons) {
      await expect(page.locator(`button:has-text("${day}")`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have region filter', async ({ page }) => {
    await expect(page.locator('button:has-text("전체 지역")')).toBeVisible();
  });

  test('should display party cards', async ({ page }) => {
    await expect(page.locator('article[data-party-id]').first()).toBeVisible();
  });

  test('should filter by day', async ({ page }) => {
    await page.click('button:has-text("금")');
    const expectedIds = await page.evaluate(() => PARTY_LIST.filter(p => p.days.includes('금')).map(p => String(p.id)));
    await expect(page.locator('article[data-party-id]')).toHaveCount(expectedIds.length);
    const ids = await page.locator('article[data-party-id]').evaluateAll(cards => cards.map(card => card.dataset.partyId));
    expect(ids).toEqual(expectedIds);
  });

  test('should open party detail modal', async ({ page }) => {
    // 카드 안의 첫 버튼은 찜하기 아이콘이므로, 상세를 여는 "파티 신청하기" 버튼을 누른다
    const firstCard = page.locator('article[data-party-id]').first();
    const clickableArea = firstCard.getByRole('button', { name: '파티 신청하기' });
    await clickableArea.click();
    
    // Wait for modal dialog to appear
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible({ timeout: 15000 });
    
    // Verify modal opens with apply button (in modal, not card)
    const applyBtn = modal.getByRole('button', { name: '파티 신청하기' });
    await expect(applyBtn).toBeVisible({ timeout: 5000 });
    
    // Close modal with close button (in the modal) - no force
    await modal.locator('button[aria-label="닫기"]').click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('should have login button', async ({ page }) => {
    await expect(page.locator('button:has-text("로그인")')).toBeVisible();
  });

  test('should have navigation to home via logo', async ({ page }) => {
    await expect(page.locator('a[href="../"]').first()).toBeVisible();
  });
});

// Live-mode contract tests use a fake Supabase SDK/API and never contact an
// actual account, database, or service_role credential.
async function loadLiveFixture(page, { parties = [], status = 200 } = {}) {
  const projectUrl = 'https://fixture-supabase.example.test';
  await page.route('**/party-connect/?live=1', async route => {
    const response = await route.fetch();
    const original = await response.text();
    const html = original
      .replace(/supabaseUrl: "[^"]*"/, 'supabaseUrl: "' + projectUrl + '"')
      .replace(/supabaseAnonKey: "[^"]*"/, 'supabaseAnonKey: "public-test-anon"');
    expect(html).not.toBe(original);
    await route.fulfill({ response, body: html });
  });
  await page.route('**/supabase.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase = {createClient: function() {return {auth: {getSession: async function() {return {data:{session:null}};},onAuthStateChange: function(){return {data:{subscription:{unsubscribe:function(){}}}};}}};}};'
  }));
  await page.route(projectUrl + '/functions/v1/partylink-api/parties', route => {
    const preflight = route.request().method() === 'OPTIONS';
    return route.fulfill({
      status: preflight ? 204 : status,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization, apikey, content-type',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
      },
      body: preflight ? '' : JSON.stringify(status === 200 ? parties : { message: '테스트 서버 오류' }),
    });
  });
  await page.goto('/party-connect/?live=1');
}

test('live parties: API rows, not demo fallback, drive rendered cards', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const serverParty = {
    id: '9167ab8e-1743-49d4-bb74-7c1accb1fa90',
    title: '서버 전용 파티',
    region: '강남/서초', category: '소개팅', days: ['금'],
    recruit: 8, currentRecruit: 1, venue: '테스트 장소',
    address: '서울 강남구', desc: '통합 테스트', images: [],
    badges: [], isFeatured: false,
  };
  await loadLiveFixture(page, { parties: [serverParty] });
  await expect(page.locator('article[data-party-id]')).toHaveCount(1, { timeout: 30000 });
  await expect(page.locator('article[data-party-id]').first()).toContainText('서버 전용 파티');
  await expect(page.locator('article[data-party-id]').first()).toHaveAttribute('data-party-id', serverParty.id);
  expect(errors).toEqual([]);
});

test('live parties: empty API response must stay empty, never show fixtures', async ({ page }) => {
  await loadLiveFixture(page, { parties: [] });
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('article[data-party-id]')).toHaveCount(0);
});

test('live parties: API error displays retry, never fake party cards', async ({ page }) => {
  await loadLiveFixture(page, { status: 500 });
  await expect(page.getByRole('alert')).toContainText('테스트 서버 오류', { timeout: 30000 });
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
  await expect(page.locator('article[data-party-id]')).toHaveCount(0);
});

test('demo page search supports consecutive typing without dropping focus', async ({ page }) => {
  await page.goto('/party-connect/');
  const search = page.locator('input[placeholder*="파티명"]');
  await expect(search).toBeVisible({ timeout: 30000 });
  await search.click();
  await page.keyboard.type('양재');
  await expect(search).toHaveValue('양재');
  await expect(search).toBeFocused();
  const ids = await page.locator('article[data-party-id]').evaluateAll(cards => cards.map(card => card.dataset.partyId));
  expect(ids).toEqual(['1']);
});

test('demo mode never fakes a login: the Kakao button is disabled', async ({ page }) => {
  await page.goto('/party-connect/');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('button', { name: /카카오로 계속하기/ })).toBeDisabled();
});

test('live signed-in user can open mypage and log out', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await loadLive(page, { path: '/party-connect/' });
  await expect(page.getByRole('button', { name: /마이페이지/ })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: /마이페이지/ }).click();
  await expect(page.getByRole('dialog', { name: '마이페이지' })).toBeVisible();
  await page.getByRole('dialog', { name: '마이페이지' }).getByRole('button', { name: '로그아웃' }).click();
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
