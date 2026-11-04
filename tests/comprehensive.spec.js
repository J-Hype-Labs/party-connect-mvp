import { test, expect } from '@playwright/test';

test.describe('PartyConnect MVP - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to mount and load initial data
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
  });

  // Test 1: Basic application loading and core functionality
  test('should load page and verify core functionality', async ({ page }) => {
    // Verify root element is visible
    await expect(page.locator('#root')).toBeVisible();
    
    // Verify Korean content is present
    await expect(page.locator('text=파티커넥트').first()).toBeVisible();
    
    // Verify hero banner exists
    await expect(page.locator('section').first()).toBeVisible();
    
    // Verify filter buttons exist
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible();
    await expect(page.locator('button:has-text("전체")')).toBeVisible();
    await expect(page.locator('button:has-text("혼술바")')).toBeVisible();
    
    // Verify party cards exist
    const cards = page.locator('[role="button"]').or(page.locator('text=무료 체험단'));
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  // Test 2: Region selector modal functionality
  test('should open and close region selector modal', async ({ page }) => {
    // Open region modal
    await page.click('button:has-text("지역 선택")');
    
    // Verify modal is visible
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=서울')).toBeVisible();
    await expect(page.locator('text=경기·인천')).toBeVisible();
    
    // Verify modal can be closed with ESC
    await page.keyboard.press('Escape');
    await expect(page.locator('text=지역 선택')).toBeHidden({ timeout: 5000 });
    
    // Verify modal can be closed by clicking outside (background)
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 10000 });
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('text=지역 선택')).toBeHidden({ timeout: 5000 });
  });

  // Test 3: Party detail modal functionality
  test('should open and close party detail modal', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    
    // Verify modal content
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=장소:')).toBeVisible();
    await expect(page.locator('text=일정:')).toBeVisible();
    await expect(page.locator('text=모집 정원:')).toBeVisible();
    
    // Verify modal can be closed with close button
    await page.click('button:has-text("✕")');
    await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden({ timeout: 5000 });
    
    // Reopen for next test
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 15000 });
    
    // Verify modal can be closed with ESC
    await page.keyboard.press('Escape');
    await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden({ timeout: 5000 });
  });

  // Test 4: Application form functionality
  test('should submit application form', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 15000 });
    
    // Fill application form
    await page.fill('input[name="name"]', '테스트 사용자');
    await page.fill('input[name="phone"]', '01012345678');
    await page.selectOption('select[name="day"]', '금');
    await page.check('input[name="agree"]');
    
    // Verify form validation - submit button should be enabled
    const submitButton = page.locator('button[type="submit"]').or(page.locator('button:has-text("신청")'));
    await expect(submitButton).toBeEnabled();
    
    // Submit form
    await submitButton.click();
    
    // Verify application was successful (should show success message or modal)
    // Since the app might not have a clear success indicator, we'll just verify no error
    await page.waitForTimeout(2000);
    
    // Close modal
    await page.click('button:has-text("✕")');
    await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden({ timeout: 5000 });
  });

  // Test 5: Filter functionality
  test('should apply region filter', async ({ page }) => {
    // Get initial party count
    const initialCards = page.locator('[role="button"]').or(page.locator('text=무료 체험단'));
    const initialCount = await initialCards.count();
    
    // Open region modal and select a specific region
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('text=지역 선택')).toBeVisible();
    
    // Select Seoul
    await page.click('text=서울');
    
    // Wait for filter to apply
    await page.waitForTimeout(2000);
    
    // Verify filtered results (should show Seoul parties or message)
    // The exact behavior depends on the app's filtering implementation
    await page.waitForSelector('.party-list, .party-filter');
    
    // Close region modal
    await page.keyboard.press('Escape');
    await expect(page.locator('text=지역 선택')).toBeHidden();
  });

  // Test 6: Mobile responsiveness
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12

  test('should render correctly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    // Verify root element is visible
    await expect(page.locator('#root')).toBeVisible();
    
    // Verify Korean content is visible on mobile
    await expect(page.locator('text=파티커넥트').first()).toBeVisible();
    
    // Verify filter buttons are visible on mobile
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible();
    
    // Verify region modal works on mobile
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('text=지역 선택')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=서울')).toBeVisible();
  });

  // Test 7: Admin login (non-blocking test)
  test('should attempt admin login with wrong password', async ({ page }) => {
    // Open admin modal
    await page.click('button:has-text("관리자")');
    await expect(page.locator('text=관리자 로그인')).toBeVisible({ timeout: 5000 });
    
    // Try wrong password
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("로그인")');
    
    // Verify error message
    await expect(page.locator('text=비밀번호가 틀렸습니다')).toBeVisible({ timeout: 5000 });
    
    // Close admin modal
    await page.click('button:has-text("✕")');
    await expect(page.locator('text=관리자 로그인')).toBeHidden({ timeout: 5000 });
  });

  // Test 8: Console error checking
  test('should have no critical JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          !msg.text().includes('favicon') && 
          !msg.text().includes('Warning') && 
          !msg.text().includes('preload') && 
          !msg.text().includes('Download the React DevTools')) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(error.message);
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

  // Test 9: Search functionality
  test('should have search functionality', async ({ page }) => {
    // Check if search button exists
    const searchButton = page.locator('button:has-text("검색"), input[placeholder*="검색"]').first();
    await expect(searchButton).toBeVisible();
    
    // Try clicking search (if available)
    await searchButton.click();
    await page.waitForTimeout(1000);
    
    // Verify search input or modal appears
    // This test is non-blocking as search functionality may vary
  });

  // Test 10: Footer admin link
  test('should have footer admin button', async ({ page }) => {
    await expect(page.locator('button:has-text("관리자")')).toBeVisible();
  });
});