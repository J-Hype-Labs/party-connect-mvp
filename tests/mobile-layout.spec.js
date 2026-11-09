import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// 모바일 레이아웃 검증: 320px / 768px 에서 가로 넘침이 없고, 카드에 업체명·주소가 보이는지 확인한다.
// (390px 는 comprehensive.spec.js 에서 검증)

const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '768px', width: 768, height: 1024 },
];
const PAGES = ['/', '/party-connect/'];
const CARD = 'article[data-party-id]';

const overflow = (page) => page.evaluate(() => ({
  doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  body: document.body.scrollWidth - document.documentElement.clientWidth,
}));

async function expectNoHorizontalOverflow(page) {
  const o = await overflow(page);
  expect(o.doc, 'documentElement 가로 넘침').toBeLessThanOrEqual(0);
  expect(o.body, 'body 가로 넘침').toBeLessThanOrEqual(0);
}

// 요소가 화면 폭 안에 완전히 들어오는지 (반올림 오차 1px 허용)
async function expectInsideViewport(page, locator) {
  const box = await locator.boundingBox();
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
}

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    test.describe(`${vp.name} ${path}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      test('데모 데이터: 가로 넘침이 없고 카드에 업체명과 주소가 보인다', async ({ page }) => {
        await page.goto(path);
        const card = page.locator(CARD).first();
        await expect(card).toBeVisible({ timeout: 30000 });
        await expectNoHorizontalOverflow(page);
        await expectInsideViewport(page, card);
        await expect(card.getByTestId('party-venue')).toBeVisible();
        await expect(card.getByTestId('party-venue')).not.toBeEmpty();
        await expect(card.getByTestId('party-address')).toBeVisible();
        await expect(card.getByTestId('party-address')).not.toBeEmpty();
      });

      test('지역 모달과 파티 상세 모달이 화면 폭을 넘지 않는다', async ({ page }) => {
        await page.goto(path);
        await expect(page.locator(CARD).first()).toBeVisible({ timeout: 30000 });

        await page.locator('button:has-text("전체 지역"):has(svg)').first().click();
        const region = page.getByRole('dialog', { name: '지역 선택' });
        await expect(region).toBeVisible();
        await expectInsideViewport(page, region.locator('> div').first());
        await expectNoHorizontalOverflow(page);
        await page.keyboard.press('Escape');
        await expect(region).toBeHidden();

        await page.locator(CARD).first().getByRole('button', { name: '파티 신청하기' }).click();
        const detail = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
        await expect(detail).toBeVisible();
        await expectInsideViewport(page, detail.locator('> div').first());
        await expectNoHorizontalOverflow(page);
      });

      test('아주 긴 업체명·주소도 카드 안에서 줄바꿈되고 가로 넘침이 없다', async ({ page }) => {
        const longParty = {
          ...FIXTURE_PARTY,
          venue: '아주긴업체이름'.repeat(8),
          address: '서울특별시 강남구 ' + '테헤란로긴주소'.repeat(10) + ' 12-34 5층',
        };
        await loadLive(page, { path, parties: [longParty] });
        const card = page.locator(CARD).first();
        await expect(card).toBeVisible({ timeout: 30000 });
        await expect(card.getByTestId('party-venue')).toContainText('아주긴업체이름');
        await expect(card.getByTestId('party-address')).toContainText('테헤란로긴주소');
        await expectInsideViewport(page, card);
        await expectInsideViewport(page, card.getByTestId('party-address'));
        await expectNoHorizontalOverflow(page);
      });
    });
  }
}
