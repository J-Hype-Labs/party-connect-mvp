import { test, expect } from '@playwright/test';

test.describe('PartyConnect Page - Dedicated Party Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/party-connect/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('should load party-connect page with h1', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('h1:has-text("파티커넥트")')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="파티명"]')).toBeVisible();
  });

  test('should have day filter chips', async ({ page }) => {
    await page.waitForTimeout(1000);
    const dayButtons = ['전체', '월', '화', '수', '목', '금', '토', '일'];
    for (const day of dayButtons) {
      await expect(page.locator(`button:has-text("${day}")`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have region filter', async ({ page }) => {
    await expect(page.locator('button:has-text("전체 지역")')).toBeVisible();
  });

  test('should display party cards', async ({ page }) => {
    await expect(page.locator('article[data-party-id]').first()).toBeVisible();
  });

  test('should filter by day', async ({ page }) => {
    await page.click('button:has-text("금")');
    await page.waitForTimeout(500);
    const cards = page.locator('article[data-party-id]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open party detail modal', async ({ page }) => {
    // Click the image area (role=button) inside the first card
    const firstCard = page.locator('article[data-party-id]').first();
    const clickableArea = firstCard.locator('[role="button"]').first();
    await clickableArea.click();
    
    // Wait for modal dialog to appear
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible({ timeout: 15000 });
    
    // Verify modal opens with apply button (in modal, not card)
    const applyBtn = modal.getByRole('button', { name: '파티 신청하기' });
    await expect(applyBtn).toBeVisible({ timeout: 5000 });
    
    // Close modal with close button (in the modal)
    await modal.locator('button[aria-label="닫기"]').click({ force: true });
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('should have login button', async ({ page }) => {
    await expect(page.locator('button:has-text("로그인")')).toBeVisible();
  });

  test('should have navigation to home via logo', async ({ page }) => {
    await expect(page.locator('a[href="/party-connect-mvp/"]').first()).toBeVisible();
  });
});