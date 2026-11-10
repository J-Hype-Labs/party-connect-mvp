import { test, expect } from '@playwright/test';

test.describe('HypeConnect MVP - Basic Load Test', () => {
  test('should load page and render root element', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('text=HypeConnect').first()).toBeVisible();
  });
});