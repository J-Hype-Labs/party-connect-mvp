import { test, expect } from '@playwright/test';

// Front-end contract tests. These deliberately target the existing home page,
// not the PartyConnect subpage being developed in a separate UI branch.
// Use scoped selectors: the first global button can be a filter chip, not a party.
const partyCards = (page) => page.locator('section#parties [role="button"]');
const partyDialog = (page) =>
  page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');

test.describe('PartyConnect user journey regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(partyCards(page).first()).toBeVisible({ timeout: 30_000 });
  });

  test('clicking a party card actually opens its detail dialog and can close it', async ({ page }) => {
    const card = partyCards(page).first();
    const dialog = partyDialog(page);
    const cardText = await card.innerText();

    await card.click();

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#party-detail-title')).toBeVisible();
    await expect(dialog).toContainText('장소:');
    await expect(dialog).toContainText('일정:');
    await expect(dialog).toContainText('모집 정원:');
    expect(cardText.trim()).not.toBe('');

    await dialog.getByRole('button', { name: '상세 닫기' }).click();
    await expect(dialog).toBeHidden();

    await card.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('application requires valid form data and survives a reload', async ({ page }) => {
    const card = partyCards(page).first();
    const dialog = partyDialog(page);
    await card.click();
    await expect(dialog).toBeVisible();

    // Support both old and revised CTA text while branches are integrating.
    const apply = dialog.getByRole('button', {
      name: /^(무료 체험단 신청하기|파티 신청하기)$/,
    });
    await expect(apply).toBeEnabled();
    await apply.click();

    await expect(dialog.locator('#applicant-name')).toBeVisible();
    await expect(dialog.locator('#applicant-phone')).toBeVisible();
    await expect(dialog.locator('#applicant-day')).toBeVisible();

    // A missing/invalid form must fail, not be silently skipped.
    await dialog.getByRole('button', { name: '신청 접수하기' }).click();
    await expect(dialog.getByRole('alert')).toContainText('이름을');

    await dialog.locator('#applicant-name').fill('테스트 사용자');
    await dialog.locator('#applicant-phone').fill('01012345678');
    await dialog.locator('#applicant-day').selectOption({ index: 0 });
    await dialog.locator('input[type="checkbox"]').check();
    await dialog.getByRole('button', { name: '신청 접수하기' }).click();

    await expect(dialog).toContainText('신청이 접수되었습니다!');
    await dialog.getByRole('button', { name: '확인' }).click();
    await expect(dialog).toBeHidden();

    // Main-branch demo persistence contract. Real-account/DB tests belong
    // to the integration owner's live environment, not a mocked CI green.
    await page.reload();
    await expect(partyCards(page).first()).toBeVisible({ timeout: 30_000 });
    await partyCards(page).first().click();
    await expect(partyDialog(page).getByRole('button', { name: '신청 완료' })).toBeDisabled();
  });
});
