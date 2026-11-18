import { test, expect } from './helpers/test-base.js';

// 관리자 신청 카드의 M-12 처리 기록 표시 + 감사 로그 조회 게이트.
// 실제 서버/SDK 없이 /admin/ 페이지와 관리자 API 를 모킹한다.
// 표시는 서버가 준 레코드를 읽기만 한다 — 클라이언트는 어떤 감사 데이터도 만들지 않는다.

const PROJECT = 'https://admin-fixture.example.test';
const API = PROJECT + '/functions/v1/partylink-api/';
const SESSION = { access_token: 'admin-token', user: { id: 'u1' } };

const appRecord = (over) => Object.assign({
  id: 'a1', slotId: 's1', status: 'APPLIED', visitCode: null, missionUrl: null, appliedAt: '2026-11-10T01:00:00Z',
  feeAmount: 10000, rejectReason: null, partyTitle: '금요 혼술', partyStartsAt: '2026-11-13T10:00:00Z',
  storeId: 'st1', storeName: '43번지 혼술바',
  guest: { id: 'g1', name: '홍길동', phone: '01012345678', noshowCount: 0, isBlocked: false },
}, over);

const AUDIT_1 = { id: 1, applicationId: 'a1', actorUserId: 'u1', actorName: '김관리', action: 'approve', metadata: {}, at: '2026-11-20T00:10:00Z' };

async function setup(page, { apps = [], holdApps = false, audits = [AUDIT_1] } = {}) {
  const calls = [];
  const state = { apps };
  let release = function () {};
  const gate = new Promise(function (res) { release = res; });

  await page.addInitScript((s) => { window.__SESSION = s; window.__oauth = null; window.__signedOut = false; }, SESSION);
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
    if (path === 'admin/me') return json(200, { isAdmin: true, userId: 'u1' });
    if (path === 'admin/parties') return json(200, []);
    if (path === 'admin/stores') return json(200, []);
    if (path === 'admin/audits') return json(200, { audits });
    if (path === 'admin/applications') {
      if (holdApps) await gate;
      const st = url.searchParams.get('status');
      return json(200, st ? state.apps.filter((a) => a.status === st) : state.apps);
    }
    return json(404, { message: 'unexpected ' + path });
  });
  return { calls, state, release };
}

const open = (page) => page.goto('/admin/?live=1');

test.describe('관리자 페이지 — M-12 처리 기록 표시', () => {
  test('감사 레코드가 없으면 카드에 처리 줄이 없다', async ({ page }) => {
    await setup(page, { apps: [appRecord(), appRecord({ id: 'a2', status: 'APPROVED', visitCode: 'K7M2ABCD12' })], audits: [] });
    await open(page);
    await expect(page.locator('#app-list li')).toHaveCount(2);
    await expect(page.locator('#app-list .audit-line')).toHaveCount(0);
    await expect(page.locator('[data-app-id="a1"]')).not.toContainText('처리');
    // 기존 표시/액션은 그대로
    await expect(page.locator('[data-app-id="a1"] .badge')).toHaveText('신청');
    await expect(page.locator('[data-app-id="a1"] [data-action="approve"]')).toBeVisible();
  });

  test('레코드가 있으면 처리: 이름 M/D HH:MM (KST) 한 줄이 뜨고 기존 버튼은 그대로다', async ({ page }) => {
    const info = await setup(page, {
      apps: [appRecord({ audit: { actorName: '김관리', action: 'approve', at: '2026-11-20T00:10:00Z' } })],
      holdApps: true,
    });
    await open(page);
    info.release();
    await expect(page.locator('#app-list .audit-line')).toHaveText('처리: 김관리 11/20 09:10');
    // 기존 로직 비파괴: APPLIED 액션 유지
    expect(await page.locator('[data-app-id="a1"] [data-action]').evaluateAll((els) => els.map((e) => e.dataset.action))).toEqual(['approve', 'reject']);
  });

  test('모듈은 실제 페이지가 로드하고, 감사 레코드가 없는 카드에는 처리 줄이 없다', async ({ page }) => {
    await setup(page, { apps: [appRecord()], audits: [] });
    await open(page);
    // admin/index.html 이 js/admin-audit.js 를 실제로 로드하는지 확인(수동 주입 없이).
    expect(await page.evaluate(() => typeof (window.AdminAudit && window.AdminAudit.summarize))).toBe('function');
    await expect(page.locator('#app-list .audit-line')).toHaveCount(0);
    await expect(page.locator('[data-app-id="a1"] .badge')).toHaveText('신청');
    await expect(page.locator('[data-app-id="a1"] [data-action="approve"]')).toBeVisible();
  });

  test('summarize 형식(KST M/D HH:MM)·결함 허용·ACTION_LABELS', async ({ page }) => {
    await setup(page, { apps: [] });
    await open(page);
    const r = await page.evaluate(() => {
      const w = window.AdminAudit;
      return {
        sample: w.summarize({ actorName: '주홍', action: 'approve', at: '2026-11-20T00:10:00Z' }),
        dateObj: w.summarize({ actorName: '주홍', action: 'reject', at: new Date('2026-11-20T00:10:00Z') }),
        epoch: w.summarize({ actorName: '주홍', at: 0 }),
        noAt: w.summarize({ actorName: '주홍' }),
        badAt: w.summarize({ actorName: '주홍', at: 'not-a-date' }),
        noName: w.summarize({ at: '2026-11-20T00:10:00Z' }),
        hollow: w.summarize({}),
        none: w.summarize(null),
        labels: w.ACTION_LABELS,
        types: [typeof w.summarize, typeof w.merge],
      };
    });
    expect(r.sample).toBe('처리: 주홍 11/20 09:10');
    expect(r.dateObj).toBe('처리: 주홍 11/20 09:10');
    expect(r.epoch).toBe('처리: 주홍 1/1 09:00');
    expect(r.noAt).toBe('처리: 주홍');
    expect(r.badAt).toBe('처리: 주홍');
    expect(r.noName).toBe('처리: 알 수 없음 11/20 09:10');
    expect(r.hollow).toBe('처리: 알 수 없음');
    expect(r.none).toBe('처리: 알 수 없음');
    expect(r.labels).toEqual({
      approve: '선정', reject: '반려', 'verify-visit': '방문 인증', 'request-revision': '보완 요청',
      complete: '최종 승인', noshow: '노쇼', block: '차단',
    });
    expect(r.types).toEqual(['function', 'function']);
  });

  test('merge: 최신 레코드 선택·복사본 반환·원본 불변', async ({ page }) => {
    await setup(page, { apps: [] });
    await open(page);
    const r = await page.evaluate(() => {
      const apps = [{ id: 'a1' }, { id: 'a2' }, { id: 7 }, {}];
      const audits = [
        { applicationId: 'a1', actorName: '오래', at: '2026-11-01T00:00:00Z' },
        { applicationId: 'a1', actorName: '최신', at: '2026-11-20T00:00:00Z' },
        { applicationId: 'a2', actorName: '무시각', at: 'nope' },
        { applicationId: 7, actorName: '숫자7' },
        { applicationId: 'a3', actorName: '남의신청' },
        { actorName: '대상없음' },
      ];
      const before = JSON.stringify({ apps, audits });
      const out = window.AdminAudit.merge(apps, audits);
      return {
        len: out.length,
        first: out[0] && out[0].audit,
        second: out[1] && out[1].audit,
        seventh: out[2] && out[2].audit,
        last: out[3] && out[3].audit,
        outIsNewArray: out !== apps,
        firstIsCopy: out[0] !== apps[0],
        auditIsCopy: out[0].audit !== audits[1],
        inputUnchanged: JSON.stringify({ apps, audits }) === before,
        empty: window.AdminAudit.merge(null, null),
      };
    });
    expect(r.len).toBe(4);
    expect(r.first).toMatchObject({ actorName: '최신', applicationId: 'a1', at: '2026-11-20T00:00:00Z' });
    expect(r.second).toMatchObject({ actorName: '무시각', applicationId: 'a2' });
    expect(r.seventh).toMatchObject({ actorName: '숫자7', applicationId: 7 });
    expect(r.last).toBeNull();
    expect(r.outIsNewArray).toBe(true);
    expect(r.firstIsCopy).toBe(true);
    expect(r.auditIsCopy).toBe(true);
    expect(r.inputUnchanged).toBe(true);
    expect(r.empty).toEqual([]);
  });

  test('감사 로그 조회는 기본 꺼짐 — 켜지면 그때만 요청한다', async ({ page }) => {
    const info = await setup(page, { apps: [], holdApps: true });
    await open(page);
    info.release();
    await expect(page.evaluate(async () => {
      return await window.ADMIN_API.audits({ applicationId: 'a1' });
    })).resolves.toBeNull();
    expect(info.calls.filter((c) => c.path === 'admin/audits')).toHaveLength(0);

    await page.evaluate(() => { window.PARTYLINK_CONFIG.auditLog = true; });
    const on = await page.evaluate(async () => await window.ADMIN_API.audits({ applicationId: 'a1' }));
    expect(on).toEqual({ audits: [AUDIT_1] });
    const auditCalls = info.calls.filter((c) => c.path === 'admin/audits');
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0].search).toContain('applicationId=a1');
    expect(auditCalls[0].auth).toBe('Bearer admin-token');

    await page.evaluate(() => { window.PARTYLINK_CONFIG.auditLog = false; });
    await expect(page.evaluate(async () => await window.ADMIN_API.audits({ applicationId: 'a1' }))).resolves.toBeNull();
    expect(info.calls.filter((c) => c.path === 'admin/audits')).toHaveLength(1);
  });

  test('모바일(360px)에서 처리 줄 포함 가로 넘침 없음', async ({ page }) => {
    const info = await setup(page, {
      apps: [
        appRecord({ audit: { actorName: '김관리', action: 'approve', at: '2026-11-20T00:10:00Z' } }),
        appRecord({ id: 'a2', status: 'APPROVED', visitCode: 'K7M2ABCD12', audit: { actorName: '이운영', action: 'noshow', at: '2026-11-05T09:00:00Z' } }),
      ],
      holdApps: true,
    });
    await page.setViewportSize({ width: 360, height: 740 });
    await open(page);
    info.release();
    await expect(page.locator('#app-list .audit-line')).toHaveCount(2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
