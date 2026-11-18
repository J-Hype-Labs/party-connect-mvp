import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// P1 정책 문구(2026-11-18 자동 확정 예시 답변)가 실제 화면에 노출되는지 검증한다.
// Q-08 선정 기준 → 파티 상세, Q-16 노쇼 30일 제한 → 상세·신청 폼, Q-21 검수 체크리스트 → 관리자 최종 승인.

const detail = (page) => page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');

async function openDetail(page, path) {
  await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
  const card = page.locator('article[data-party-id="' + FIXTURE_PARTY.id + '"]');
  await card.getByRole('button', { name: '파티 신청하기', exact: true }).click();
  await expect(detail(page)).toBeVisible({ timeout: 30000 });
  return detail(page);
}

for (const path of ['/', '/party-connect/']) {
  test.describe('P1 정책 문구 ' + path, () => {
    test('Q-08: 파티 상세에 선정 기준 3단계가 공개된다', async ({ page }) => {
      const dlg = await openDetail(page, path);
      await expect(dlg.getByText('선정 기준', { exact: true })).toBeVisible();
      await expect(dlg.getByText(/차단·노쇼 이력이 없는 분을 먼저 봅니다/)).toBeVisible();
      await expect(dlg.getByText(/SNS 계정이 있는 분을 우선/)).toBeVisible();
      await expect(dlg.getByText(/신청이 빠른 순입니다/)).toBeVisible();
    });

    test('Q-16: 상세와 신청 폼에 노쇼 30일 제한이 안내된다', async ({ page }) => {
      const dlg = await openDetail(page, path);
      const notice = /선정 후 불참\(노쇼\) 시 벌점이 쌓이고, 누적되면 30일간 신청이 제한됩니다/;
      await expect(dlg.getByText(notice)).toBeVisible();

      // 상세 → 신청 폼으로 넘어가면 동의 체크박스 아래 같은 안내가 한 번 더 보인다.
      await dlg.getByRole('button', { name: '파티 신청하기', exact: true }).click();
      await expect(dlg.getByLabel('이름')).toBeVisible();
      await expect(dlg.getByText(notice)).toBeVisible();
    });

    test('예시 파티 상세에는 선정 기준·노쇼 안내가 없다', async ({ page }) => {
      await loadLive(page, { path, parties: [], signedIn: false });
      const example = page.locator('article[data-party-id^="example-"]').first();
      await expect(example).toBeVisible({ timeout: 30000 });
      await example.getByRole('button', { name: /프라이빗 소셜 라운지 모임/ }).click();
      await expect(detail(page)).toBeVisible();
      await expect(detail(page).getByText('선정 기준', { exact: true })).toHaveCount(0);
      await expect(detail(page).getByText(/30일간 신청이 제한됩니다/)).toHaveCount(0);
    });
  });
}
