import { expect } from '@playwright/test';

// 실서비스(live) 모드 화면을 실제 Supabase 없이 검증하기 위한 공용 fixture.
// - 설정 값(URL/키)은 응답 HTML 에서 가짜 값으로 바꾼다 (배포된 실제 값 유무와 무관).
// - supabase-js SDK 와 partylink-api 를 모두 mock 한다. 실제 계정·DB·service_role 을 호출하지 않는다.
// 데모 모드에서는 카카오 로그인이 비활성이라 "로그인 후 신청" 흐름은 이 fixture 로만 검증할 수 있다.

export const FIXTURE_PROJECT = 'https://fixture-supabase.example.test';

export const FIXTURE_PARTY = {
  id: '9167ab8e-1743-49d4-bb74-7c1accb1fa90',
  title: '서버 전용 테스트 파티',
  region: '강남/서초', category: '소개팅', days: ['금', '토'],
  recruit: 8, currentRecruit: 1, venue: '테스트 장소',
  address: '서울 강남구', desc: '통합 테스트', images: [],
  badges: [], isFeatured: false,
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ path?: string, parties?: object[], signedIn?: boolean, partiesStatus?: number }} [opts]
 * @returns {Promise<{ calls: {method: string, path: string, body: any}[], applications: object[] }>}
 */
export async function loadLive(page, { path = '/', parties = [FIXTURE_PARTY], signedIn = true, partiesStatus = 200 } = {}) {
  const calls = [];
  const state = { applications: [] };
  const session = signedIn
    ? { access_token: 'user-token', user: { id: 'user-1', created_at: '2026-11-01T00:00:00Z', app_metadata: { provider: 'kakao' }, user_metadata: { name: '테스트유저', onboarding_complete: true } } }
    : null;

  await page.addInitScript((s) => { window.__SESSION = s; window.__signedOut = false; }, session);
  await page.route('**/supabase.js', (route) => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.supabase = { createClient: function () { return { auth: {
      getSession: async function () { return { data: { session: window.__SESSION }, error: null }; },
      onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
      signInWithOAuth: async function () { return { error: null }; },
      signOut: async function () { window.__SESSION = null; window.__signedOut = true; return { error: null }; }
    } }; } };`,
  }));

  const pagePattern = '**' + path.replace(/\/$/, '') + '/?live=1';
  await page.route(pagePattern, async (route) => {
    const res = await route.fetch();
    const original = await res.text();
    const html = original
      .replace(/supabaseUrl: "[^"]*"/, 'supabaseUrl: "' + FIXTURE_PROJECT + '"')
      .replace(/supabaseAnonKey: "[^"]*"/, 'supabaseAnonKey: "public-test-anon"');
    expect(html).toContain(FIXTURE_PROJECT);
    await route.fulfill({ response: res, body: html });
  });

  await page.route(FIXTURE_PROJECT + '/functions/v1/partylink-api/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const apiPath = new URL(req.url()).pathname.replace('/functions/v1/partylink-api/', '');
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    calls.push({ method: req.method(), path: apiPath, body });
    const json = (status, data) => route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(data) });

    if (apiPath === 'parties') {
      return partiesStatus === 200 ? json(200, parties) : json(partiesStatus, { message: '테스트 서버 오류' });
    }
    if (apiPath === 'applications' && req.method() === 'GET') return json(200, state.applications);
    if (apiPath === 'applications' && req.method() === 'POST') {
      // 실제 서버(GET /applications)와 같은 모양: partyId, userId 를 내려 준다
      const app = {
        id: 'app-' + (state.applications.length + 1), partyId: body.slotId, partyTitle: (parties.find((p) => p.id === body.slotId) || {}).title || '',
        name: body.name, phone: body.phone, day: body.day, status: 'APPLIED', appliedAt: new Date().toISOString(), userId: 'user-1',
      };
      state.applications.push(app);
      return json(201, app);
    }
    return json(404, { message: 'unexpected ' + req.method() + ' ' + apiPath });
  });

  await page.goto(path.replace(/\/$/, '') + '/?live=1');
  return { calls, applications: state.applications };
}
