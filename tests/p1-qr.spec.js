import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// G-16 방문 QR: 마이페이지에서 승인(APPROVED) + 방문 인증 코드가 있는 신청에만 QR이 렌더링된다.
// 실제 Supabase 없이 SDK/API를 mock 한다 (tests/helpers/live-fixture.js).

const app = (over = {}) => ({
  id: 'app-1', partyId: FIXTURE_PARTY.id, partyTitle: FIXTURE_PARTY.title, venue: '테스트 장소', day: '금',
  name: '홍길동', phone: '01012345678', appliedAt: '2026-11-08T03:00:00Z', userId: 'user-1',
  status: 'APPROVED', visitCode: 'HC-7F3K9Q', rejectReason: null, ...over,
});

// 두 페이지의 마이페이지 진입 방법이 다르다: HypeConnect는 프로필 메뉴, 탐색은 헤더 버튼.
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

for (const path of ['/', '/party-connect/']) {
  test.describe('방문 QR ' + path, () => {
    test('승인된 신청의 방문 인증 코드 아래에 QR이 렌더링된다', async ({ page }) => {
      await loadLive(page, { path, applications: [app()] });
      const dialog = await openMyPage(page, path);

      await expect(dialog.getByText('방문 인증 코드:', { exact: false })).toContainText('HC-7F3K9Q');
      const qr = dialog.getByRole('img', { name: '방문 인증 QR 코드 HC-7F3K9Q' });
      await expect(qr).toBeVisible();
      await expect(qr.locator('svg')).toHaveCount(1);
      await expect(qr.locator('svg')).toHaveAttribute('shape-rendering', 'crispEdges');
      await expect(dialog.getByText('현장에서 이 QR을 보여주세요')).toBeVisible();
    });

    test('승인 전 신청에는 QR이 없다', async ({ page }) => {
      await loadLive(page, { path, applications: [app({ status: 'APPLIED', visitCode: null })] });
      const dialog = await openMyPage(page, path);
      await expect(dialog.getByRole('img', { name: /방문 인증 QR 코드/ })).toHaveCount(0);
    });
  });
}
