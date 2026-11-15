import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// G-08 파티 공유 링크: ?party=id 딥링크로 상세 진입, 실제 파티 공유 버튼이 링크를 복사.
// 브라우저마다 navigator.share 유무가 달라, 클립보드 경로를 결정적으로 검증하려고 모킹한다.
// 예시 파티에 공유 버튼이 없는지는 showcase.spec 에서도 회귀 검증한다.

const detail = page => page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');

async function mockShare(page) {
  await page.addInitScript(() => {
    try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); }
    catch (e) { navigator.share = undefined; }
    const clipboard = { writeText: (t) => { window.__copiedText = t; return Promise.resolve(); } };
    try { Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true }); }
    catch (e) { navigator.clipboard = clipboard; }
  });
}

for (const path of ['/', '/party-connect/']) {
  test.describe('파티 공유 ' + path, () => {
    test('딥링크 ?party=id 로 해당 파티 상세가 열리고 URL이 정리된다', async ({ page }) => {
      await mockShare(page);
      await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false, search: '&party=' + FIXTURE_PARTY.id });
      await expect(detail(page)).toBeVisible({ timeout: 30000 });
      await expect(detail(page)).toContainText(FIXTURE_PARTY.title);
      await expect.poll(() => page.evaluate(() => window.location.search)).toBe('');
    });

    test('실제 파티 공유 버튼이 ?party=id 링크를 복사하고 토스트를 띄운다', async ({ page }) => {
      await mockShare(page);
      await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
      const card = page.locator('article[data-party-id="' + FIXTURE_PARTY.id + '"]');
      await card.getByRole('button', { name: '파티 신청하기', exact: true }).click();
      await expect(detail(page)).toBeVisible();
      const share = detail(page).getByRole('button', { name: '파티 공유하기' });
      await expect(share).toBeVisible();
      await share.click();
      await expect(page.getByText('파티 링크가 복사되었어요.')).toBeVisible();
      const copied = await page.evaluate(() => window.__copiedText);
      expect(copied).toMatch(/^https?:\/\//);
      expect(copied).toContain('?party=' + FIXTURE_PARTY.id);
    });

    test('예시 파티 상세에는 공유 버튼이 없다', async ({ page }) => {
      await mockShare(page);
      await loadLive(page, { path, parties: [], signedIn: false });
      const example = page.locator('article[data-party-id^="example-"]').first();
      await example.getByRole('button', { name: /프라이빗 소셜 라운지 모임/ }).click();
      await expect(detail(page)).toBeVisible();
      await expect(detail(page).locator('button[aria-label*="공유"]')).toHaveCount(0);
    });
  });
}
