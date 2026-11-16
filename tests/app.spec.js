import { test, expect } from '@playwright/test';

test.describe('HypeConnect MVP - Basic Load Test', () => {
  test('should load page and render root element', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#root')).toBeVisible();
    // 헤더 로고 이미지는 모든 뷰포트에서 보인다. 'text=HypeConnect'는 모바일에서 숨겨지는 데스크톱 내비 링크를 먼저 잡을 수 있다.
    await expect(page.locator('img[alt="HypeConnect"]').first()).toBeVisible();
  });
});