import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// G-14 신청 취소: 취소 가능 조건과 운영 규칙 안내(Q-17 확정 답변)가 화면에 표시되는지 검증한다.
// 실제 서버 취소 처리는 실서버 검증이 필요한 범위라 여기서는 UI 안내·버튼 노출 조건만 본다.

const app = (over = {}) => ({
  id: 'app-1', partyId: FIXTURE_PARTY.id, partyTitle: FIXTURE_PARTY.title, venue: '테스트 장소', day: '금',
  name: '홍길동', phone: '01012345678', appliedAt: '2026-11-08T03:00:00Z', userId: 'user-1',
  status: 'APPLIED', visitCode: null, rejectReason: null, ...over,
});

const CANCEL_HINT = /선정 전에는 언제든 취소할 수 있어요/;

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
  test.describe('신청 취소 ' + path, () => {
    test('선정 대기 신청에 취소 버튼과 취소 기한 안내가 함께 보인다', async ({ page }) => {
      await loadLive(page, { path, applications: [app()] });
      const dialog = await openMyPage(page, path);
      await expect(dialog.getByRole('button', { name: '신청 취소' })).toBeVisible();
      await expect(dialog.getByText(CANCEL_HINT)).toBeVisible();
      await expect(dialog.getByText(/파티 시작 24시간 전까지만 취소/)).toBeVisible();
      await expect(dialog.getByText(/노쇼로 처리돼요/)).toBeVisible();
    });

    test('이미 선정된 신청에는 취소 버튼과 안내가 없다', async ({ page }) => {
      await loadLive(page, { path, applications: [app({ status: 'APPROVED', visitCode: 'HC-7F3K9Q' })] });
      const dialog = await openMyPage(page, path);
      await expect(dialog.getByRole('button', { name: '신청 취소' })).toHaveCount(0);
      await expect(dialog.getByText(CANCEL_HINT)).toHaveCount(0);
    });

    test('완료된 신청에는 취소 관련 안내가 없다', async ({ page }) => {
      await loadLive(page, { path, applications: [app({ status: 'COMPLETED' })] });
      const dialog = await openMyPage(page, path);
      await expect(dialog.getByRole('button', { name: '신청 취소' })).toHaveCount(0);
      await expect(dialog.getByText(CANCEL_HINT)).toHaveCount(0);
    });
  });
}
