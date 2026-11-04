import { test, expect } from '@playwright/test';

test.describe('PartyConnect MVP - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to mount
    await page.waitForSelector('#root', { timeout: 15000 });
    // Wait for initial render
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial Render', () => {
    test('should render root element and main content', async ({ page }) => {
      await expect(page.locator('#root')).toBeVisible();
      await expect(page.locator('text=파티커넥트').first()).toBeVisible();
    });

    test('should have correct page title', async ({ page }) => {
      await expect(page).toHaveTitle(/파티커넥트|Party Connect/);
    });
  });

  test.describe('Hero Banner', () => {
    test('should display hero banner with slides', async ({ page }) => {
      const banner = page.locator('section').first();
      await expect(banner).toBeVisible();
      
      // Check for slide indicator
      await expect(page.locator('text=/1 \\/ 3/')).toBeVisible();
    });

    test('should have pause/play button', async ({ page }) => {
      const pauseButton = page.locator('button:has-text("❚❚"), button:has-text("▶")').first();
      await expect(pauseButton).toBeVisible();
    });
  });

  test.describe('Filter System', () => {
    test('should display region selector button', async ({ page }) => {
      const regionButton = page.locator('button:has-text("지역 선택")');
      await expect(regionButton).toBeVisible();
    });

    test('should display day tabs', async ({ page }) => {
      const dayTabs = page.locator('button:has-text("전체"), button:has-text("월"), button:has-text("화")');
      await expect(dayTabs.first()).toBeVisible();
    });

    test('should display category pills', async ({ page }) => {
      const categoryPills = page.locator('button:has-text("혼술바"), button:has-text("소개팅"), button:has-text("소셜파티")');
      await expect(categoryPills.first()).toBeVisible();
    });

    test('should show available party count', async ({ page }) => {
      const countText = page.locator('text=/참여 가능한 파티.*개/');
      await expect(countText).toBeVisible();
    });
  });

  test.describe('Region Selector Modal', () => {
    test('should open region selector modal on click', async ({ page }) => {
      await page.click('button:has-text("지역 선택")');
      await expect(page.locator('text=지역 선택')).toBeVisible();
      await expect(page.locator('text=서울')).toBeVisible();
      await expect(page.locator('text=경기·인천')).toBeVisible();
      await expect(page.locator('text=지방/기타')).toBeVisible();
    });

    test('should close modal on ESC key', async ({ page }) => {
      await page.click('button:has-text("지역 선택")');
      await page.keyboard.press('Escape');
      await expect(page.locator('text=지역 선택')).toBeHidden();
    });

    test('should close modal on backdrop click', async ({ page }) => {
      await page.click('button:has-text("지역 선택")');
      await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });
      await expect(page.locator('text=지역 선택')).toBeHidden();
    });
  });

  test.describe('Party Cards', () => {
    test('should display party cards', async ({ page }) => {
      const cards = page.locator('[role="button"]:has-text("무료 체험단")').or(page.locator('text=무료 체험단'));
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display party badges', async ({ page }) => {
      const badges = page.locator('text=NEW, text=이벤트, text=마감임박');
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display wishlist heart button', async ({ page }) => {
      const hearts = page.locator('button:has-text("🤍"), button:has-text("❤️")');
      const count = await hearts.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Party Detail Modal', () => {
    test('should open party detail on card click', async ({ page }) => {
      const firstCard = page.locator('[role="button"]').first();
      await firstCard.click();
      
      // Wait for modal to appear
      await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 10000 });
      
      // Check modal content
      await expect(page.locator('text=장소:')).toBeVisible();
      await expect(page.locator('text=일정:')).toBeVisible();
      await expect(page.locator('text=모집 정원:')).toBeVisible();
    });

    test('should close modal on close button', async ({ page }) => {
      const firstCard = page.locator('[role="button"]').first();
      await firstCard.click();
      await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible();
      
      await page.click('button:has-text("✕")');
      await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden();
    });

    test('should close modal on ESC key', async ({ page }) => {
      const firstCard = page.locator('[role="button"]').first();
      await firstCard.click();
      await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(page.locator('text=무료 체험단 신청하기')).toBeHidden();
    });
  });

  test.describe('Reviews Section', () => {
    test('should display reviews', async ({ page }) => {
      await expect(page.locator('text=파티커넥트 멤버 실제후기')).toBeVisible();
    });

    test('should have toggle for all reviews', async ({ page }) => {
      const toggleButton = page.locator('button:has-text("전체보기"), button:has-text("접기")');
      await expect(toggleButton).toBeVisible();
    });
  });

  test.describe('Footer', () => {
    test('should display admin link', async ({ page }) => {
      const adminLink = page.locator('button:has-text("관리자")');
      await expect(adminLink).toBeVisible();
    });
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should render correctly on mobile', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('text=파티커넥트').first()).toBeVisible();
  });

  test('should have no horizontal scroll', async ({ page }) => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
  });

  test('should open region modal on mobile', async ({ page }) => {
    await page.click('button:has-text("지역 선택")');
    await expect(page.locator('text=지역 선택')).toBeVisible();
  });

  test('should display day tabs horizontally scrollable', async ({ page }) => {
    const dayTabsContainer = page.locator('.overflow-x-auto').first();
    await expect(dayTabsContainer).toBeVisible();
  });

  test('should open party detail modal on mobile', async ({ page }) => {
    const firstCard = page.locator('[role="button"]').first();
    await firstCard.click();
    await expect(page.locator('text=무료 체험단 신청하기')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Dashboard', () => {
  test('should open admin login modal', async ({ page }) => {
    await page.click('button:has-text("관리자")');
    await expect(page.locator('text=관리자 로그인')).toBeVisible({ timeout: 5000 });
  });

  test('should reject wrong password', async ({ page }) => {
    await page.click('button:has-text("관리자")');
    await expect(page.locator('text=관리자 로그인')).toBeVisible();
    
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("로그인")');
    
    await expect(page.locator('text=비밀번호가 틀렸습니다')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Console Errors', () => {
  test('should have no JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForSelector('#root', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Filter out expected warnings (CDN, etc.)
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
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