import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const cards = page => page.locator('article[data-party-id]');
const examples = page => page.locator('article[data-party-id^="example-"]');
const rows = n => Array.from({ length: n }, (_, i) => ({
  ...FIXTURE_PARTY, id: 'real-' + i, title: '실제 행사 ' + i,
  missionRequirements: '방문 사진 2장\n체험단 혜택 제공 표시',
  startsAt: '2026-11-20T10:05:00Z', endsAt: '2026-11-20T12:30:00Z',
}));

test('showcase contract: preserves fields and inputs, unique IDs, isolated examples', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync('js/party-showcase.js', 'utf8'), sandbox);
  const { build, MIN_DISPLAY_COUNT } = sandbox.window.PartyShowcase;
  expect(MIN_DISPLAY_COUNT).toBe(6);
  for (const n of [0, 3, 6, 7]) {
    const original = Object.freeze(rows(n).map(p => Object.freeze({ ...p, custom: 'preserved' })));
    const built = build(original);
    expect(built).toHaveLength(Math.max(6, n));
    expect(built.filter(p => p.isExample)).toHaveLength(Math.max(0, 6 - n));
    expect(new Set(built.map(p => p.id)).size).toBe(built.length);
    original.forEach((p, i) => {
      expect(built[i]).toMatchObject(p);
      expect(p.isExample).toBeUndefined();
    });
  }
  const first = build([]);
  first[0].images.push('mutated'); first[0].days.push('mutated'); first[0].title = 'mutated';
  const next = build([]);
  expect(next[0].images).not.toContain('mutated');
  expect(next[0].days).not.toContain('mutated');
  expect(next[0].title).not.toBe('mutated');
});

test('API normalization keeps camel/snake mission text and rejects object values', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync('js/party-api.js', 'utf8'), sandbox);
  const normalize = sandbox.window.PARTYLINK_PARTY_API.normalizeServerParties;
  const values = normalize([
    { ...FIXTURE_PARTY, missionRequirements: '사진 2장' },
    { ...FIXTURE_PARTY, mission_requirements: '협찬 표시' },
    { ...FIXTURE_PARTY, missionRequirements: { invalid: true } },
    FIXTURE_PARTY,
  ]);
  expect(Array.from(values, row => row.missionRequirements)).toEqual(['사진 2장', '협찬 표시', '', '']);
});

for (const path of ['/', '/party-connect/']) {
  test.describe('showcase ' + path, () => {
    test('unconfigured hosted environment stays closed', async ({ page }) => {
      await page.route('**/js/auth-client.js', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()) +
          '\nObject.assign(window.PARTYLINK_AUTH, {live:false, configured:false, isLocal:false});' });
      });
      await page.goto(path);
      await expect(page.getByText(/실서비스 설정이 없어/)).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
    });

    for (const n of [0, 3, 6, 7]) {
      test('API ' + n + ' rows: real first, fill only shortage', async ({ page }) => {
        await loadLive(page, { path, parties: rows(n), signedIn: false });
        await expect(cards(page)).toHaveCount(Math.max(6, n), { timeout: 30000 });
        await expect(examples(page)).toHaveCount(Math.max(0, 6 - n));
        const ids = await cards(page).evaluateAll(nodes => nodes.map(node => node.dataset.partyId));
        expect(ids.slice(0, n)).toEqual(rows(n).map(p => p.id));
        for (const card of await examples(page).all()) {
          await expect(card.getByText('예시', { exact: true })).toBeVisible();
          await expect(card.getByRole('button', { name: '신청 오픈 예정', exact: true })).toBeDisabled();
          await expect(card.locator('button[aria-label*="관심"], button[aria-label*="공유"]')).toHaveCount(0);
        }
      });
    }

    for (const status of [404, 500]) {
      test('API ' + status + ': preserve error, no example fallback', async ({ page }) => {
        await loadLive(page, { path, partiesStatus: status, signedIn: false });
        await expect(page.getByRole('alert')).toContainText('테스트 서버 오류');
        await expect(cards(page)).toHaveCount(0);
        await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
      });
    }

    test('loading waits for successful API before showing examples', async ({ page }) => {
      await loadLive(page, { path, parties: [], signedIn: false });
      await expect(examples(page)).toHaveCount(6);
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route('**/functions/v1/partylink-api/parties', async route => {
        if (route.request().method() === 'OPTIONS') return route.fallback();
        await gate;
        await route.fallback();
      });
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/불러오는 중/).first()).toBeVisible();
        await expect(cards(page)).toHaveCount(0);
      } finally { release(); }
      await expect(examples(page)).toHaveCount(6);
    });

    test('search and category filters distinguish real/example counts', async ({ page }) => {
      await loadLive(page, { path, parties: rows(3), signedIn: false });
      await expect(cards(page)).toHaveCount(6);
      await expect(page.getByText(/실제\s*3개\s*·\s*예시\s*3개/)).toBeVisible();
      const search = page.locator('input[placeholder*="파티명"], input[placeholder*="검색"]');
      await search.fill('실제 행사');
      await expect(cards(page)).toHaveCount(3);
      await expect(examples(page)).toHaveCount(0);
      await expect(page.getByText(/실제\s*3개\s*·\s*예시\s*0개/)).toBeVisible();
      await search.fill('양재');
      await expect(examples(page)).toHaveCount(1);
      await expect(cards(page)).toHaveCount(1);
      await search.fill('');
      await page.getByRole('button', { name: '혼술바', exact: true }).click();
      await expect(cards(page)).toHaveCount(1);
      await expect(examples(page)).toHaveCount(1);
      await expect(page.getByText(/실제\s*0개\s*·\s*예시\s*1개/)).toBeVisible();
    });

    test('example detail is readable but cannot apply, save, or share; SVG loads', async ({ page }) => {
      const { calls } = await loadLive(page, { path, parties: [], signedIn: false });
      await expect(examples(page)).toHaveCount(6);
      const card = examples(page).first();
      const image = card.locator('img').first();
      await expect(image).toHaveAttribute('src', /assets\/party-example-\d+\.svg$/);
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await card.getByRole('button', { name: /프라이빗 소셜 라운지 모임/ }).click();
      const detail = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
      await expect(detail).toBeVisible();
      await expect(detail.getByText('예시', { exact: true })).toBeVisible();
      await expect(detail).toContainText('(예시)');
      await expect(detail).toContainText('(가명)');
      await expect(detail).toContainText('제휴 매장이 확정되면 실제 파티로 열려요');
      await expect(detail.getByRole('button', { name: '신청 오픈 예정', exact: true })).toBeDisabled();
      await expect(detail.locator('button[aria-label*="관심"], button[aria-label*="공유"]')).toHaveCount(0);
      expect(calls.filter(call => call.method === 'POST')).toEqual([]);
    });

    for (const mission of ['방문 사진 2장\n<img src=x onerror=alert(1)>', '']) {
      test('detail mission: ' + (mission ? 'safe text and preserved schedule' : 'absent field hidden'), async ({ page }) => {
        const party = { ...rows(1)[0], missionRequirements: mission };
        await loadLive(page, { path, parties: [party], signedIn: false });
        const card = page.locator('article[data-party-id="real-0"]');
        await card.getByRole('button', { name: '파티 신청하기', exact: true }).click();
        const detail = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
        await expect(detail).toBeVisible();
        await expect(detail).toContainText('19:05');
        await expect(detail).toContainText('21:30');
        if (mission) {
          await expect(detail).toContainText(mission);
          await expect(detail.locator('img[onerror]')).toHaveCount(0);
        } else {
          await expect(detail.getByText('미션 조건', { exact: true })).toHaveCount(0);
        }
      });
    }
  });
}

test('home: guide replaces fake reviews and partners; only supported banners', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '이렇게 진행돼요' })).toBeVisible();
  await expect(page.locator('#partners')).toHaveCount(0);
  await expect(page.getByText('따뜻한리듬헌터8090')).toHaveCount(0);
  await expect(page.getByText(/추천인 적립금 2배|무료 초대 티켓/)).toHaveCount(0);
  await expect(page.getByText('체험단 모집', { exact: true })).toBeVisible();
  await expect(page.getByText('점주 모집', { exact: true })).toBeVisible();
});
