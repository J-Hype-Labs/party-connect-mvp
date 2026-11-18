import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// L-06 반응형 점검: 새 UI(날짜 필터 칩, 방문 QR)가 320px~1440px에서 가로 넘침 없이 보이고 동작하는지.
// 카드·모달 일반 반응형은 mobile-layout.spec.js 가 검증한다.

const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '1440px', width: 1440, height: 900 },
];
const PAGES = ['/', '/party-connect/'];

const overflow = (page) => page.evaluate(() => ({
  doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  body: document.body.scrollWidth - document.documentElement.clientWidth,
}));

async function expectNoOverflow(page) {
  const o = await overflow(page);
  expect(o.doc, 'document 가로 넘침').toBeLessThanOrEqual(0);
  expect(o.body, 'body 가로 넘침').toBeLessThanOrEqual(0);
}

const app = (over = {}) => ({
  id: 'app-1', partyId: FIXTURE_PARTY.id, partyTitle: FIXTURE_PARTY.title, venue: '테스트 장소', day: '금',
  name: '홍길동', phone: '01012345678', appliedAt: '2026-11-08T03:00:00Z', userId: 'user-1',
  status: 'APPROVED', visitCode: 'HC-7F3K9Q', rejectReason: null, ...over,
});

async function openMyPage(page, path) {
  if (path === '/') {
    await page.getByRole('button', { name: '프로필 메뉴' }).click();
    await page.getByRole('button', { name: '마이페이지' }).click();
  } else {
    await expect(page.getByRole('button', { name: /마이페이지/ })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /마이페이지/ }).click();
  }
  const dialog = page.getByRole('dialog', { name: '마이페이지' });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const vp of VIEWPORTS) {
  for (const path of PAGES) {
    test.describe(`P1 반응형 ${vp.name} ${path}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
      });

      test('날짜 필터 칩이 가로 넘침 없이 보이고 동작한다', async ({ page }) => {
        await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
        await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });
        const group = page.getByRole('group', { name: '날짜 필터' });
        await expect(group).toBeVisible();
        await expectNoOverflow(page);
        await group.getByRole('button', { name: '주말', exact: true }).click();
        await expect(group.getByRole('button', { name: '주말', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expectNoOverflow(page);
      });

      test('방문 QR이 마이페이지 안에서 가로 넘침 없이 보인다', async ({ page }) => {
        await loadLive(page, { path, applications: [app()] });
        const dialog = await openMyPage(page, path);
        const qr = dialog.getByRole('img', { name: '방문 인증 QR 코드 HC-7F3K9Q' });
        await expect(qr).toBeVisible();
        await expectNoOverflow(page);
        const box = await qr.boundingBox();
        const width = await page.evaluate(() => document.documentElement.clientWidth);
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      });

      test('선정 기준·노쇼 안내 카드가 상세 모달 안에서 가로 넘침 없이 보인다', async ({ page }) => {
        await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
        const card = page.locator('article[data-party-id="' + FIXTURE_PARTY.id + '"]');
        await card.getByRole('button', { name: '파티 신청하기', exact: true }).click();
        const dialog = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
        await expect(dialog).toBeVisible({ timeout: 30000 });
        await expect(dialog.getByText('선정 기준', { exact: true })).toBeVisible();
        await expectNoOverflow(page);
        const box = await dialog.getByText('선정 기준', { exact: true }).boundingBox();
        const width = await page.evaluate(() => document.documentElement.clientWidth);
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      });
    });
  }
}
