import { test, expect } from '@playwright/test';

test.describe('PartyConnect MVP - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to mount
    await page.waitForSelector('#root', { timeout: 30000 });
    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render root element and Korean content', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('text=파티커넥트').first()).toBeVisible();
  });

  test('should have hero banner', async ({ page }) => {
    await expect(page.locator('section').first()).toBeVisible();
    await expect(page.locator('text=/1 \\/ 3/')).toBeVisible();
  });

  test('should have filter buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible();
    await expect(page.locator('button:has-text("전체")')).toBeVisible();
    await expect(page.locator('button:has-text("혼술바")')).toBeVisible();
  });

  test('should have party cards', async ({ page }) => {
    const cards = page.locator('[role="button"]').or(page.locator('text=무료 체험단'));
    await expect(cards.first()).toBeVisible();
  });

  test('should open region modal', async ({ page }) => {
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=서울')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('text=지역 선택')).toBeHidden({ timeout: 5000 });
  });

  test('should open party detail modal', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden({ timeout: 5000 });
  });

  test('should have reviews section', async ({ page }) => {
    await expect(page.locator('text=파티커넥트 멤버 실제후기')).toBeVisible();
  });

  test('should have admin link in footer', async ({ page }) => {
    await expect(page.locator('button:has-text("관리자")')).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.reload();
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const criticalErrors = errors.filter(e => 
      !e.includes('Warning') &&
      !e.includes('preload') &&
      !e.includes('Download the React DevTools')
    );
    
    if (criticalErrors.length > 0) {
      console.log('JavaScript errors found:', criticalErrors);
    }
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render correctly on mobile', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('text=파티커넥트').first()).toBeVisible();
  });

  test('should have no horizontal scroll', async ({ page }) => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should open region modal on mobile', async ({ page }) => {
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 5000 });
  });

  test('should open party detail modal on mobile', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 15000 });
  });
});