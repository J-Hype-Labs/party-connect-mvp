import { test, expect } from './helpers/test-base.js';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

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

// 배포 설정 회귀 가드 — 운영 장애(#32): auth/callback/index.html 에
// window.PARTYLINK_CONFIG 가 없어 카카오 로그인이 실패했다. js/auth-client.js 를
// <script>로 로드하는 HTML 을 fs 로 동적 탐색(node_modules·test-results 제외)해
// ① window.PARTYLINK_CONFIG 가 auth-client.js 로드 이전에 정의되고
// ② supabaseUrl·supabaseAnonKey 가 비어 있지 않은 문자열인지 검사한다.
// 설정 값 자체는 실패 메시지에 넣지 않는다 (공개 키여도 출력 최소화).
test.describe('PARTYLINK_CONFIG deployment guard', () => {
  const SKIP_DIRS = new Set(['node_modules', 'test-results', '.git', 'playwright-report']);
  const AUTH_SCRIPT_RE = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*auth-client\.js["']/i;

  function collectHtmlLoadingAuthClient(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collectHtmlLoadingAuthClient(full, out);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        const src = readFileSync(full, 'utf8');
        if (AUTH_SCRIPT_RE.test(src)) out.push({ full, src });
      }
    }
    return out;
  }

  function readConfigString(block, key) {
    const keyIdx = block.indexOf(key + ':');
    if (keyIdx === -1) return null;
    let i = keyIdx + key.length + 1;
    while (i < block.length && /\s/.test(block[i])) i += 1;
    const quote = block[i];
    if (quote !== '"' && quote !== "'") return null;
    const end = block.indexOf(quote, i + 1);
    if (end === -1) return null;
    return block.slice(i + 1, end);
  }

  test('auth-client.js 를 로드하는 모든 HTML 에 PARTYLINK_CONFIG 가 선행 정의된다', async () => {
    const root = process.cwd(); // `npx playwright test` 실행 디렉터리 = 레포 루트
    const found = collectHtmlLoadingAuthClient(root);

    expect(
      found.length,
      `js/auth-client.js 로드 HTML 을 3개 이상 찾아야 함 (발견: ${found.length})`
    ).toBeGreaterThanOrEqual(3);

    for (const { full, src } of found) {
      const rel = path.relative(root, full).split(path.sep).join('/');
      const cfgMatch = src.match(/window\.PARTYLINK_CONFIG\s*=/);
      const cfgIdx = cfgMatch ? cfgMatch.index : -1;
      const authMatch = src.match(AUTH_SCRIPT_RE);
      const authIdx = authMatch ? authMatch.index : -1;

      expect(cfgIdx, `${rel}: window.PARTYLINK_CONFIG 가 없다`).toBeGreaterThanOrEqual(0);
      expect(cfgIdx, `${rel}: PARTYLINK_CONFIG 는 js/auth-client.js 로드 이전이어야 한다`).toBeLessThan(authIdx);

      const blockEnd = src.indexOf('};', cfgIdx);
      const block = src.slice(cfgIdx, blockEnd === -1 ? undefined : blockEnd + 2);
      for (const key of ['supabaseUrl', 'supabaseAnonKey']) {
        const value = readConfigString(block, key);
        expect(value, `${rel}: ${key} 가 비어 있지 않은 문자열이 아니다`).not.toBeNull();
        expect(value, `${rel}: ${key} 가 비어 있다`).not.toBe('');
      }
    }
  });

  test('콜백 페이지: 로드 시 window.PARTYLINK_AUTH.configured === true', async ({ page }) => {
    await page.goto('/auth/callback/');
    const configured = await page.evaluate(() => window.PARTYLINK_AUTH?.configured === true);
    expect(configured, '/auth/callback/ 에 Supabase 설정이 인식되지 않았다').toBe(true);
  });
});
