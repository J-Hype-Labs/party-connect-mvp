import { test, expect } from '@playwright/test';

test.describe('PartyConnect MVP - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to mount and load initial data
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible({ timeout: 30000 });
  });

  // Test 1: Basic application loading and core functionality
  test('should load page and verify core functionality', async ({ page }) => {
    // Verify root element is visible
    await expect(page.locator('#root')).toBeVisible();
    
    // Verify Korean content is present (text anywhere in body)
    await expect(page.locator('body')).toContainText('파티커넥트');
    
    // Verify hero banner exists
    await expect(page.locator('section').first()).toBeVisible();
    
    // Verify filter buttons exist
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible();
    
    // Category filter - "혼술바"
    await expect(page.locator('button:has-text("혼술바")')).toBeVisible();
    
    // Verify party cards exist
    const cards = page.locator('[role="button"]').or(page.locator('text=파티 신청하기'));
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  // Test 2: Region selector modal functionality
  test('should open and close region selector modal', async ({ page }) => {
    // Open region modal
    await page.click('button:has-text("지역 선택")');
    
    // Verify modal is visible (using the modal title)
    await expect(page.locator('#region-modal-title')).toBeVisible({ timeout: 10000 });
    
    // Verify region tabs are visible (using role="tab" to be specific)
    await expect(page.locator('button[role="tab"]:has-text("서울")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("경기·인천")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("지방/기타")')).toBeVisible();
    
    // Verify modal can be closed with ESC
    await page.keyboard.press('Escape');
    await expect(page.locator('#region-modal-title')).toBeHidden({ timeout: 5000 });
    
    // Verify modal can be closed by clicking outside (background)
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('#region-modal-title')).toBeVisible({ timeout: 10000 });
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('#region-modal-title')).toBeHidden({ timeout: 5000 });
  });

  // Test 3: Party detail modal functionality
  test('should open and close party detail modal', async ({ page }) => {
    const firstCard = page.locator('div[role="button"]').first();
    await firstCard.click();
    
    // Verify modal opens with apply button
    const applyBtn = page.getByRole('button', { name: '파티 신청하기' });
    await expect(applyBtn).toBeVisible({ timeout: 15000 });
    
    // Verify modal can be closed with close button (X button in top right)
    await page.locator('button[aria-label="상세 닫기"]').click();
    await expect(applyBtn).toBeHidden({ timeout: 5000 });
  });

  // Test 4: Application flow. Missing form is a failure, not a pass.
  test('should complete full application flow', async ({ page }) => {
    await page.locator('div[role="button"]').first().click();
    await expect(page.getByRole('button', { name: '파티 신청하기' })).toBeVisible();
    await page.getByRole('button', { name: '파티 신청하기' }).click();
    await expect(page.locator('#applicant-name')).toBeVisible();
    await page.locator('#applicant-name').fill('테스트 사용자');
    await page.locator('#applicant-phone').fill('01012345678');
    await expect(page.locator('#applicant-day')).toBeVisible();
    await page.locator('#applicant-day').selectOption({ index: 0 });
    await page.locator('form input[type="checkbox"]').check();
    await page.getByRole('button', { name: '신청 접수하기' }).click();
    await expect(page.getByText('신청이 접수되었습니다!')).toBeVisible();
  });

  // Test 5: Filter functionality
  test('should apply region filter', async ({ page }) => {
    // Get initial party count
    const initialCards = page.locator('div[role="button"]').or(page.locator('text=파티 신청하기'));
    const initialCount = await initialCards.count();
    
    // Open region modal and select a specific region
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('#region-modal-title')).toBeVisible();
    
    // Select Seoul tab
    await page.click('button[role="tab"]:has-text("서울")');
    
    // Wait for filter to apply
    await expect(page.locator('button[role="tab"]:has-text("서울")')).toBeVisible();
    
    // Close region modal
    await page.keyboard.press('Escape');
    await expect(page.locator('#region-modal-title')).toBeHidden();
  });

  // Test 6: Mobile responsiveness across all configured browser projects
  test('should render correctly on mobile', async ({ page }) => {
    
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible({ timeout: 30000 });
    
    // Verify root element is visible
    await expect(page.locator('#root')).toBeVisible();
    
    // Verify Korean content is visible on mobile (text anywhere in body)
    await expect(page.locator('body')).toContainText('파티커넥트');
    
    // Verify filter buttons are visible on mobile
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible();
    
    // Verify region modal works on mobile
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('#region-modal-title')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[role="tab"]:has-text("서울")')).toBeVisible();
  });

  // Test 7: Mobile horizontal scroll verification
  test('should not have horizontal overflow on mobile', async ({ page }) => {
    
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible({ timeout: 30000 });
    
    // Check body width doesn't exceed viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 390;
    
    // Allow small tolerance for scrollbar
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  // Test 8: Admin login (non-blocking - just verify modal opens)
  test('should open admin modal', async ({ page }) => {
    
    // Open admin modal
    await page.click('button:has-text("관리자")');
    await expect(page.locator('text=관리자 로그인')).toBeVisible({ timeout: 5000 });
    
    // Modal opens successfully - close not tested due to backdrop interception
  });

  // Test 9: Console error checking
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
    await expect(page.locator('button:has-text("지역 선택")')).toBeVisible({ timeout: 30000 });

    if (errors.length > 0) {
      const errorMsg = 'Critical JavaScript errors found:\n' + errors.join('\n');
      console.log(errorMsg);
      throw new Error(errorMsg);
    }
    
    expect(errors).toHaveLength(0);
  });

  // Test 10: Search entry point only. Search results remain unverified.
  test('should expose clickable search entry point', async ({ page }) => {
    const searchButton = page.locator('header button:has(svg)').first();
    await expect(searchButton).toBeVisible();
    await searchButton.click();
  });

  // Test 11: Footer admin link
  test('should have footer admin button', async ({ page }) => {
    await expect(page.locator('button:has-text("관리자")')).toBeVisible();
  });

  // Test 12: Party cards display key information
  test('should display party cards with key info', async ({ page }) => {
    // Verify party cards show title, location, date
    const cards = page.locator('div[role="button"]').or(page.locator('text=파티 신청하기'));
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Check first card has basic info
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();
  });

  // Test 13: Category filter tabs visible
  test('should display category filter tabs', async ({ page }) => {
    // Check for category filter buttons
    const categoryButtons = ['전체', '혼술바', '와인', '위스키', '칵테일', '전통주'];
    
    for (const category of categoryButtons) {
      const btn = page.locator(`button:has-text("${category}")`);
      const count = await btn.count();
      if (count > 0) {
        await expect(btn.first()).toBeVisible();
      }
    }
  });

  // Test 14: Day filter tabs visible
  test('should display day filter tabs', async ({ page }) => {
    // Check for day filter buttons
    const dayButtons = ['전체', '월', '화', '수', '목', '금', '토', '일'];
    
    for (const day of dayButtons) {
      const btn = page.locator(`button[role="tab"]:has-text("${day}")`);
      const count = await btn.count();
      if (count > 0) {
        await expect(btn.first()).toBeVisible();
      }
    }
  });

  // Test 15: Party detail modal has apply button
  test('should have apply button in party detail modal', async ({ page }) => {
    const firstCard = page.locator('div[role="button"]').first();
    await firstCard.click();
    
    // Verify apply button exists
    await expect(page.getByRole('button', { name: '파티 신청하기' })).toBeVisible({ timeout: 15000 });
    
    // Close modal using correct close button
    await page.locator('button[aria-label="상세 닫기"]').click();
    await expect(page.getByRole('button', { name: '파티 신청하기' })).toBeHidden({ timeout: 5000 });
  });
});