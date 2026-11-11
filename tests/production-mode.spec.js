import { test, expect } from './helpers/test-base.js';

// 호스팅(운영) 사이트의 데모 모드 고정 해제 — SPECIFICATION.md B4.
// resolveLiveMode 는 순수 함수이므로 호스트를 위조하지 않고 계약만 검증한다.
// ?demo=1 은 로컬에서만 데모이고, 설정된 운영 사이트에서는 실서비스를 끌 수 없다.
// 설정이 없는 호스팅 사이트는 비실서비스(=데모 데이터 금지, fail-closed)다.

test.describe('Production mode guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('resolveLiveMode: 호스팅에서는 demo=1 이 설정을 우회할 수 없다', async ({ page }) => {
    const actual = await page.evaluate(() => {
      const run = (configured, hostname, query) =>
        window.PARTYLINK_AUTH.resolveLiveMode({ configured, hostname, searchParams: new URLSearchParams(query) });
      return [
        run(true, 'j-hype-labs.github.io', '?demo=1'), // 운영+설정+demo=1 → 실서비스 유지(우회 차단)
        run(false, 'j-hype-labs.github.io', ''),       // 운영+미설정 → 비실서비스(fail-closed)
        run(true, 'localhost', '?demo=1'),              // 로컬+demo=1 → 데모(비실서비스) 유지
        run(true, 'localhost', '?live=1')               // 로컬+live=1 → 실서비스
      ];
    });

    expect(actual).toEqual([true, false, false, true]);
  });

  test('auth surface: configured/environment 노출, 로컬 기본은 데모 유지', async ({ page }) => {
    const surface = await page.evaluate(() => ({
      hasResolve: typeof window.PARTYLINK_AUTH.resolveLiveMode === 'function',
      configured: window.PARTYLINK_AUTH.configured,
      environment: window.PARTYLINK_AUTH.environment,
      live: window.PARTYLINK_AUTH.live
    }));
    expect(surface.hasResolve).toBe(true);
    expect(typeof surface.configured).toBe('boolean');
    expect(typeof surface.environment).toBe('string');

    // localhost 기본(쿼리 없음)은 기존대로 데모: 데모 카드가 보이고 설정 오류가 아니다.
    await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="parties-load-error"]')).toHaveCount(0);
  });
});
