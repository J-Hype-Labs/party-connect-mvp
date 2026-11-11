import { test, expect } from './helpers/test-base.js';
import fs from 'node:fs';

// 관리자 — 헤더 로고와 정산 내역 CSV 내보내기.
// 실제 Supabase/DB 를 호출하지 않고 SDK 와 /admin/* API 를 mock 합니다.

const PROJECT = 'https://admin-csv-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const store = { id: 'st1', name: '43번지 혼술바', ownerName: '김사장', phone: '01011112222', address: '서울 강남구 1', region: '강남', prepaidBalance: 20000, defaultFeePerGuest: 10000, isActive: true };
// API 는 최신순으로 내려준다
const DEPOSITS = [
  { id: 2, applicationId: 'app-1', type: 'DEDUCT', amount: 10000, balanceBefore: 30000, balanceAfter: 20000, depositorName: null, memo: '방문 미션 승인 수수료', createdAt: '2026-11-08T01:00:00Z' },
  { id: 1, applicationId: null, type: 'CHARGE', amount: 30000, balanceBefore: 0, balanceAfter: 30000, depositorName: '=HYPERLINK("http://evil")', memo: '11월 입금, "선입금"', createdAt: '2026-11-07T01:00:00Z' },
];

async function setup(page, { deposits = DEPOSITS } = {}) {
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
    calls.push({ method: req.method(), path, search: url.search });
    const json = (status, b) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(b) });
    if (path === 'admin/me') return json(200, { isAdmin: true, userId: 'u1' });
    if (path === 'admin/applications' || path === 'admin/parties') return json(200, []);
    if (path === 'admin/stores') return json(200, [store]);
    if (path === 'admin/stores/st1/deposits') return json(200, deposits);
    return json(404, { message: 'unexpected ' + path });
  });
  return calls;
}

const openStores = async (page) => {
  await page.goto('/admin/?live=1');
  await page.locator('[data-nav="stores"]').click();
  await expect(page.locator('[data-store-id="st1"]')).toBeVisible();
};

test.describe('관리자 — 헤더 로고', () => {
  test('로고 이미지가 실제로 불러와지고 이름은 HypeConnect, 파비콘도 연결된다', async ({ page }) => {
    await setup(page);
    await page.goto('/admin/?live=1');
    const logo = page.locator('.topbar').getByRole('img', { name: 'HypeConnect' });
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '../assets/hypeconnect-icon.svg');
  });
});

test.describe('CSV 도구 (순수 함수)', () => {
  // 로그인 없이도 스크립트는 로드된다
  test.beforeEach(async ({ page }) => { await page.goto('/admin/'); });

  test('수식으로 시작하는 문자열 앞에 \' 를 붙이고, 숫자는 그대로 둔다', async ({ page }) => {
    const out = await page.evaluate(() => {
      const c = window.ADMIN_CSV.cell;
      return ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx', '홍길동', 5, -5, 0, null, undefined].map(c);
    });
    expect(out).toEqual(["'=1+1", "'+1", "'-1", "'@SUM(A1)", "'\tx", "\"'\rx\"", '홍길동', '5', '-5', '0', '', '']);
  });

  test('쉼표·따옴표·줄바꿈이 있는 값은 따옴표로 감싸 이스케이프한다', async ({ page }) => {
    const out = await page.evaluate(() => ['a,b', 'say "hi"', 'x\ny', "=a,b"].map(window.ADMIN_CSV.cell));
    expect(out).toEqual(['"a,b"', '"say ""hi"""', '"x\ny"', "\"'=a,b\""]);
  });

  test('UTF-8 BOM 으로 시작하고 줄은 CRLF 로 끝난다', async ({ page }) => {
    const csv = await page.evaluate(() => window.ADMIN_CSV.build(['가', '나'], [['1', '2']]));
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toBe('﻿가,나\r\n1,2\r\n');
  });

  test('원장 CSV: 오래된 순, 한국 시간, 구분 라벨, 인젝션 방지', async ({ page }) => {
    const csv = await page.evaluate(([s, d]) => window.ADMIN_CSV.ledgerCsv(s, d), [store, DEPOSITS]);
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toBe('일시(KST),점포,구분,금액,변경 전 잔액,변경 후 잔액,입금자명,메모,신청 ID,거래 ID');
    expect(lines).toHaveLength(3);
    // 오래된 충전이 먼저, 시간은 KST(+9h)
    expect(lines[1].startsWith('2026-11-07 10:00:00,43번지 혼술바,충전,30000,0,30000,')).toBe(true);
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(lines[1]).toContain('"11월 입금, ""선입금"""');
    expect(lines[2]).toBe('2026-11-08 10:00:00,43번지 혼술바,차감,10000,30000,20000,,방문 미션 승인 수수료,app-1,2');
  });

  test('파일 이름에서 경로·특수문자를 제거하고 KST 날짜를 붙인다', async ({ page }) => {
    const names = await page.evaluate(() => {
      const now = new Date('2026-11-10T16:00:00Z'); // KST 2026-11-11 01:00
      return ['43번지 혼술바', '../../etc/passwd', 'a/b\\c:d*e', '', '😀😀'].map((n) => window.ADMIN_CSV.fileName(n, now));
    });
    expect(names).toEqual([
      'hypeconnect-ledger-43번지_혼술바-20261111.csv',
      'hypeconnect-ledger-etc_passwd-20261111.csv',
      'hypeconnect-ledger-a_b_c_d_e-20261111.csv',
      'hypeconnect-ledger-store-20261111.csv',
      'hypeconnect-ledger-store-20261111.csv',
    ]);
  });
});

test.describe('관리자 — 점포 원장 CSV 저장', () => {
  test('버튼을 누르면 최대 건수로 원장을 받아 BOM 이 있는 CSV 파일로 저장한다', async ({ page }) => {
    const calls = await setup(page);
    await openStores(page);
    const download = page.waitForEvent('download');
    await page.locator('[data-store-id="st1"] [data-action="export-csv"]').click();
    const dl = await download;
    expect(dl.suggestedFilename()).toMatch(/^hypeconnect-ledger-43번지_혼술바-\d{8}\.csv$/);
    const bytes = fs.readFileSync(await dl.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const text = bytes.toString('utf8').replace('﻿', '');
    expect(text).toContain('충전,30000,0,30000');
    expect(text).toContain("'=HYPERLINK");
    await expect(page.locator('.toast.ok')).toContainText('CSV를 저장했습니다.');
    const req = calls.find((c) => c.path === 'admin/stores/st1/deposits' && c.search.includes('limit=500'));
    expect(req).toBeTruthy();
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0); // 서버 상태를 바꾸지 않는다
  });

  test('내역이 없으면 파일을 만들지 않고 안내한다', async ({ page }) => {
    await setup(page, { deposits: [] });
    await openStores(page);
    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.locator('[data-store-id="st1"] [data-action="export-csv"]').click();
    await expect(page.locator('.toast')).toContainText('내보낼 거래 내역이 없습니다.');
    expect(downloaded).toBe(false);
  });

  test('500건에 도달하면 일부만 포함된다고 알려 준다', async ({ page }) => {
    const many = Array.from({ length: 500 }, (_, i) => ({ id: 500 - i, applicationId: null, type: 'CHARGE', amount: 1000, balanceBefore: 0, balanceAfter: 1000, depositorName: '입금', memo: null, createdAt: '2026-11-07T01:00:00Z' }));
    await setup(page, { deposits: many });
    await openStores(page);
    const download = page.waitForEvent('download');
    await page.locator('[data-store-id="st1"] [data-action="export-csv"]').click();
    await download;
    await expect(page.locator('.toast.ok')).toContainText('최근 500건까지만');
  });
});
