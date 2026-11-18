import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// G-05 날짜 필터: KST 기준 이번 주/주말/날짜 지정.
// 실제 시각 의존을 없애려고 클록을 고정한다. 기준 2026-11-16(월) KST, 이번 주 = 11/16(월)~11/22(일).
// 실제 파티 6건(예시 채움 없음)으로 시작일을 통제해 건수를 결정적으로 검증한다.

const cards = page => page.locator('article[data-party-id]');
const FIXED_NOW = '2026-11-16T00:00:00+09:00';

const PARTIES = [
  { ...FIXTURE_PARTY, id: 'p-sat', title: '토요일 파티', startsAt: '2026-11-21T19:00:00+09:00' },
  { ...FIXTURE_PARTY, id: 'p-wed', title: '수요일 파티', startsAt: '2026-11-18T19:00:00+09:00' },
  { ...FIXTURE_PARTY, id: 'p-nextwed', title: '다음주 수요일 파티', startsAt: '2026-11-25T19:00:00+09:00' },
  { ...FIXTURE_PARTY, id: 'p-sun', title: '일요일 파티', startsAt: '2026-11-22T19:00:00+09:00' },
  { ...FIXTURE_PARTY, id: 'p-fri', title: '금요일 파티', startsAt: '2026-11-20T19:00:00+09:00' },
  { ...FIXTURE_PARTY, id: 'p-nextsat', title: '다음주 토요일 파티', startsAt: '2026-11-28T19:00:00+09:00' },
];

for (const path of ['/', '/party-connect/']) {
  test.describe('날짜 필터 ' + path, () => {
    test('이번 주/주말/날짜 지정 칩이 KST 날짜로 파티를 거른다', async ({ page }) => {
      // 클록은 페이지를 열기 전에 고정한다. 헤드리스 CI(특히 WebKit)에서 이동 후 고정하면
      // Babel 스크립트가 Date 를 다시 잡는 순간 고정값이 무시될 수 있기 때문이다.
      await page.clock.setFixedTime(new Date(FIXED_NOW));
      await loadLive(page, { path, parties: PARTIES, signedIn: false });
      await expect(cards(page)).toHaveCount(6, { timeout: 30000 });
      // 클록 고정이 실제로 적용됐는지 먼저 확인한다(CI 러너 타임존과 무관해야 한다).
      await expect.poll(() => page.evaluate(() => new Date().toISOString())).toBe(new Date(FIXED_NOW).toISOString());
      const group = page.getByRole('group', { name: '날짜 필터' });

      // 이번 주: 토(21)·수(18)·일(22)·금(20) = 4건, 다음주 수(25)·토(28) 제외
      await group.getByRole('button', { name: '이번 주', exact: true }).click();
      await expect(group.getByRole('button', { name: '이번 주', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(cards(page)).toHaveCount(4, { timeout: 15000 });

      // 주말: 토(21)·일(22) = 2건
      await group.getByRole('button', { name: '주말', exact: true }).click();
      await expect(cards(page)).toHaveCount(2);

      // 날짜 지정: 2026-11-25 → 다음주 수요일 1건
      await group.getByRole('button', { name: '날짜 지정', exact: true }).click();
      await page.getByLabel('필터 날짜 지정').fill('2026-11-25');
      await expect(cards(page)).toHaveCount(1);
      await expect(cards(page)).toHaveAttribute('data-party-id', 'p-nextwed');

      // 전체: 다시 6건
      await group.getByRole('button', { name: '전체', exact: true }).click();
      await expect(cards(page)).toHaveCount(6);
    });
  });
}
