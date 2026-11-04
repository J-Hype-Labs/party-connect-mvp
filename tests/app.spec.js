import { test, expect } from '@playwright/test';

test.describe('PartyConnect MVP - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to mount
    await page.waitForSelector('#root', { timeout: 30000 });
    // Wait for initial render
    await page.waitForLoadState('domcontentloaded');
    // Wait for Babel to transpile
    await page.waitForTimeout(5000);
  });

  test('should render root element and Korean content', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('text=파티커넥트').first()).toBeVisible();
  });

  test('should have hero banner section', async ({ page }) => {
    await expect(page.locator('section').first()).toBeVisible();
  });

  test('should have filter buttons', async ({ page }) => {
    const regionBtn = page.locator('button').filter({ hasText: '지역 선택' });
    await expect(regionBtn).toBeVisible();
    
    const allDayBtn = page.locator('button').filter({ hasText: '전체' });
    await expect(allDayBtn).toBeVisible();
    
    const categoryBtn = page.locator('button').filter({ hasText: '혼술바' });
    await expect(categoryBtn).toBeVisible();
  });

  test('should have party cards', async ({ page }) => {
    const cards = page.locator('[role="button"]').or(page.locator('text=무료 체험단'));
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    await expect(cards.first()).toBeVisible();
  });

  test('should open region modal', async ({ page }) => {
    const regionBtn = page.locator('button').filter({ hasText: '지역 선택' });
    await regionBtn.click();
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=서울')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('text=지역 선택')).toBeHidden({ timeout: 5000 });
  });

  test('should open party detail modal', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 20000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden({ timeout: 5000 });
  });

  test('should have reviews section', async ({ page }) => {
    await expect(page.locator('text=파티커넥트 멤버 실제후기')).toBeVisible();
  });

  test('should have admin link in footer', async ({ page }) => {
    const adminBtn = page.locator('button').filter({ hasText: '관리자' });
    await expect(adminBtn).toBeVisible();
  });

  test('should have no critical console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon') &&
            !text.includes('babel') &&
            !text.includes('Babel') &&
            !text.includes('Download the React DevTools') &&
            !text.includes('Warning:') &&
            !text.includes('preload') &&
            !text.includes('Failed to load resource')) {
          errors.push(text);
        }
      }
    });
    page.on('pageerror', error => {
      const msg = error.message;
      if (!msg.includes('babel') && !msg.includes('Babel')) {
        errors.push(msg);
      }
    });

    await page.reload();
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    if (errors.length > 0) {
      console.log('Critical JavaScript errors found:', errors);
    }
    
    expect(errors).toHaveLength(0);
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
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
    const regionBtn = page.locator('button').filter({ hasText: '지역 선택' });
    await regionBtn.click();
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 10000 });
  });

  test('should open party detail modal on mobile', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 20000 });
  });
});