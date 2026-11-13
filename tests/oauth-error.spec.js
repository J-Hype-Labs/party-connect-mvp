import { test, expect } from './helpers/test-base.js';

test.describe('OAuth Error Handling', () => {
  test('main page shows toast and cleans URL when error params present', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('[OAuth Error]')) {
        errors.push(msg.text());
      }
    });

    // Navigate with OAuth error params
    await page.goto('/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired');
    
    // Wait for toast to appear
    await expect(page.getByText('로그인 시간이 지나 다시 시도가 필요해요.')).toBeVisible({ timeout: 5000 });
    
    // Check that error params are removed from URL
    const url = page.url();
    expect(url).not.toContain('error=');
    expect(url).not.toContain('error_code=');
    expect(url).not.toContain('error_description=');
    
    // Check console.warn was called
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('[OAuth Error]'))).toBe(true);
    expect(errors.some(e => e.includes('bad_oauth_state'))).toBe(true);
  });

  test('party-connect page shows toast and cleans URL when error params present', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('[OAuth Error]')) {
        errors.push(msg.text());
      }
    });

    // Navigate with OAuth error params
    await page.goto('/party-connect/?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+has+expired');
    
    // Wait for toast to appear
    await expect(page.getByText('로그인 시간이 지나 다시 시도가 필요해요.')).toBeVisible({ timeout: 5000 });
    
    // Check that error params are removed from URL
    const url = page.url();
    expect(url).not.toContain('error=');
    expect(url).not.toContain('error_code=');
    expect(url).not.toContain('error_description=');
    
    // Check console.warn was called
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('[OAuth Error]'))).toBe(true);
    expect(errors.some(e => e.includes('bad_oauth_state'))).toBe(true);
  });

  test('generic error code shows generic message', async ({ page }) => {
    await page.goto('/?error=access_denied&error_code=other_code&error_description=User+denied+access');
    
    // Should show generic message
    await expect(page.getByText('로그인이 완료되지 않았어요. 다시 시도해 주세요.')).toBeVisible({ timeout: 5000 });
    
    // Check that error params are removed
    const url = page.url();
    expect(url).not.toContain('error=');
    expect(url).not.toContain('error_code=');
    expect(url).not.toContain('error_description=');
  });

  test('preserves other URL params when cleaning error params', async ({ page }) => {
    await page.goto('/?error=invalid_request&error_code=bad_oauth_state&search=test&foo=bar');
    
    // Wait for toast
    await expect(page.getByText('로그인 시간이 지나 다시 시도가 필요해요.')).toBeVisible({ timeout: 5000 });
    
    // Check that other params are preserved
    const url = page.url();
    expect(url).toContain('search=test');
    expect(url).toContain('foo=bar');
    expect(url).not.toContain('error=');
  });

  test('handles error in hash fragment', async ({ page }) => {
    await page.goto('/#error=invalid_request&error_code=bad_oauth_state');
    
    await expect(page.getByText('로그인 시간이 지나 다시 시도가 필요해요.')).toBeVisible({ timeout: 5000 });
    
    const url = page.url();
    expect(url).not.toContain('error=');
    expect(url).not.toContain('error_code=');
  });
});