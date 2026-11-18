// S-04 점주 방문 인증 — UI 골격 검증.
// 대상: owner/visit.html + js/owner-visit.js (+ 문서: docs/OWNER_VISIT_API_CONTRACT.md).
// 실제 점주 권한 API 는 이 worktree 에 없으므로(다른 작업자 병렬 진행) 기본 상태는 fail-closed 이고,
// 인증 흐름은 transport 주입(mocks)으로 검증한다. 관리자 /admin/* 경로는 사용하지 않는다.
// 카메라/QR 스캔은 범위 밖이라 구현·검증하지 않는다 (코드 입력만).

import { test, expect } from './helpers/test-base.js';

const PAGE = '/owner/visit.html';

async function openVisit(page) {
  await page.goto(PAGE);
  await expect(page.getByRole('heading', { name: '점주 방문 인증' })).toBeVisible();
  await expect(page.locator('#owner-verify-btn')).toBeVisible();
  // configure 이벤트를 받는 useEffect 리스너가 마운트된 뒤에 테스트가 configure 하도록 보장한다.
  await expect.poll(() => page.evaluate(() => window.OwnerVisit && typeof window.OwnerVisit.isAvailable === 'function')).toBe(true);
}

// 페이지 컨텍스트에서 OwnerVisit 모듈을 기다렸다가 transport 를 주입한다 (테스트 seam).
async function configureOwnerApi(page, { result } = { result: 'resolve' }) {
  await page.evaluate(({ result }) => {
    window.__ownerCalls = [];
    window.OwnerVisit.configure({
      ownerApiEnabled: true,
      reason: '',
      transport: async (req) => {
        window.__ownerCalls.push({ applicationId: req.applicationId, code: req.code });
        if (result === 'resolve') return { ok: true, applicationId: req.applicationId, status: 'VISITED' };
        const err = new Error(window.__ownerMessage);
        err.status = window.__ownerStatus;
        err.code = window.__ownerCode;
        throw err;
      },
    });
  }, { result });
  // configure 는 owner-visit:config 이벤트로 React 상태를 갱신한다. 반영을 기다린다.
  await expect.poll(() => page.evaluate(() => window.OwnerVisit.isAvailable())).toBe(true);
}

async function mockError(page, { status, code, message }) {
  await page.evaluate(({ status, code, message }) => {
    window.__ownerStatus = status;
    window.__ownerCode = code;
    window.__ownerMessage = message;
  }, { status, code, message });
  await configureOwnerApi(page, { result: 'reject' });
}

async function fillCode(page, { applicationId = 'app_1', code }) {
  if (applicationId) await page.fill('#owner-application', applicationId);
  if (code !== undefined) await page.fill('#owner-visit-code', code);
}

for (const width of [320, 1440]) {
  test.describe('점주 방문 인증 레이아웃 @ ' + width + 'px', () => {
    test('가로 넘침 없음 (body 내 모든 요소)', async ({ page }) => {
      // 레이아웃을 재는 검사이므로 뷰포트를 먼저 고정한다(나중에 바꾸면 반영 전에 측정될 수 있다).
      await page.setViewportSize({ width, height: 900 });
      await openVisit(page);
      await mockError(page, { status: 409, code: 'OUTSIDE_WINDOW', message: '아직 인증 시간창이 아닙니다.' });
      await fillCode(page, { code: 'HC-7F3K9Q' });
      await page.getByRole('button', { name: '인증' }).click();
      await expect(page.locator('[data-testid="owner-result"]')).toContainText('아직 인증 시간창이 아닙니다.');
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const bad = [];
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
            const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
            bad.push(el.tagName.toLowerCase() + cls);
          }
        });
        return bad;
      });
      expect(overflow, 'overflowing elements @ ' + width + 'px: ' + overflow.join(', ')).toEqual([]);
    });
  });
}

test.describe('점주 방문 인증 - 모듈/기본 상태', () => {
  test('기본값은 fail-closed: API 미준비 안내, 입력 비활성, 요청 없음', async ({ page }) => {
    await openVisit(page);

    await expect(page.getByText(/점주 인증 API가 아직 준비되지 않았습니다/)).toBeVisible();
    await expect(page.locator('#owner-application')).toBeDisabled();
    await expect(page.locator('#owner-visit-code')).toBeDisabled();
    await expect(page.locator('#owner-verify-btn')).toBeDisabled();
    await expect(page.getByText(/방문 인증은 파티 시작 60분 전부터 종료 시간까지 가능합니다/)).toBeVisible();

    await page.evaluate(() => {
      window.__fetchCalls = 0;
      const nativeFetch = window.fetch;
      window.fetch = function () { window.__fetchCalls += 1; return nativeFetch.apply(this, arguments); };
    });
    const code = await page.evaluate(() => window.OwnerVisit.verifyVisit('app_1', 'HC-7F3K9Q')
      .then(() => 'resolved', (e) => e.code));
    expect(code).toBe('OWNER_API_NOT_READY');
    expect(await page.evaluate(() => window.__fetchCalls)).toBe(0);
  });

  test('모듈 계약: normalizeCode/isValidCodeFormat', async ({ page }) => {
    await openVisit(page);
    const cases = await page.evaluate(() => {
      const norm = (v) => window.OwnerVisit.normalizeCode(v);
      return {
        lower: norm('hc7f3k9q'), spaced: norm('HC-7F3 K9Q'), padded: norm('  hc-7f3k9q  '),
        empty: norm(''), noPrefix: norm('7F3K9Q'), short: norm('HC-7F3K'),
      };
    });
    expect(cases).toEqual({ lower: 'HC-7F3K9Q', spaced: 'HC-7F3K9Q', padded: 'HC-7F3K9Q', empty: '', noPrefix: '7F3K9Q', short: 'HC-7F3K' });

    const valid = await page.evaluate(() => ({
      canonical: window.OwnerVisit.isValidCodeFormat('HC-7F3K9Q'),
      lower: window.OwnerVisit.isValidCodeFormat('hc7f3k9q'),
      alnum: window.OwnerVisit.isValidCodeFormat('HC-123456'),
      noPrefix: window.OwnerVisit.isValidCodeFormat('7F3K9Q'),
      short: window.OwnerVisit.isValidCodeFormat('HC-7F3K9'),
      empty: window.OwnerVisit.isValidCodeFormat(''),
    }));
    expect(valid).toEqual({ canonical: true, lower: true, alnum: true, noPrefix: false, short: false, empty: false });
  });
});

test.describe('점주 방문 인증 - 입력/요청 흐름 (transport mock)', () => {
  test('입력 정규화 + 잘못된 형식에서 버튼 비활성/오류 노출', async ({ page }) => {
    await openVisit(page);
    await configureOwnerApi(page);

    await page.fill('#owner-application', 'app_1');
    await expect(page.locator('#owner-verify-btn')).toBeDisabled(); // 코드 없음/형식 오류

    await page.fill('#owner-visit-code', 'hc7f3k9q'); // 8자 → 하이픈 보정
    await expect(page.locator('#owner-visit-code')).toHaveValue('HC-7F3K9Q');
    await expect(page.locator('#owner-verify-btn')).toBeEnabled();

    await page.fill('#owner-visit-code', '7F3K9Q'); // HC- 접두 없음
    await expect(page.locator('#owner-visit-code')).toHaveValue('7F3K9Q');
    await expect(page.locator('#owner-verify-btn')).toBeDisabled();
    await expect(page.locator('#owner-visit-code')).toHaveAttribute('aria-invalid', 'true');

    await page.fill('#owner-visit-code', 'HC-7F3K9Q');
    await expect(page.locator('#owner-visit-code')).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('#owner-verify-btn')).toBeEnabled();
    expect(await page.evaluate(() => window.__ownerCalls ?? [])).toEqual([]); // 신고만, 요청 없음
  });

  test('신청 ID 없으면 요청 없이 로컬 오류', async ({ page }) => {
    await openVisit(page);
    await configureOwnerApi(page);
    await page.fill('#owner-visit-code', 'HC-7F3K9Q');
    await page.getByRole('button', { name: '인증' }).click();
    await expect(page.getByText('신청 ID가 없어 인증을 시작할 수 없습니다. 내 신청 목록에서 확인해 주세요.')).toBeVisible();
    expect(await page.evaluate(() => window.__ownerCalls ?? [])).toEqual([]);
  });

  test('성공: 인증 호출 후 "방문을 인증했습니다."', async ({ page }) => {
    await openVisit(page);
    await configureOwnerApi(page, { result: 'resolve' });
    await fillCode(page, { code: 'HC-7F3K9Q' });
    await page.getByRole('button', { name: '인증' }).click();
    await expect(page.getByText('방문을 인증했습니다.')).toBeVisible();
    expect(await page.evaluate(() => window.__ownerCalls)).toEqual([{ applicationId: 'app_1', code: 'HC-7F3K9Q' }]);
  });

  test('409(시간창): 서버 메시지 그대로 표시', async ({ page }) => {
    await openVisit(page);
    await mockError(page, { status: 409, code: 'OUTSIDE_WINDOW', message: '아직 인증 시간창이 아닙니다. 파티 시작 60분 전부터 가능합니다.' });
    await fillCode(page, { code: 'HC-7F3K9Q' });
    await page.getByRole('button', { name: '인증' }).click();
    await expect(page.locator('[data-testid="owner-result"]')).toContainText('아직 인증 시간창이 아닙니다. 파티 시작 60분 전부터 가능합니다.');
    await expect(page.locator('[data-code="OUTSIDE_WINDOW"]')).toBeVisible();
    expect(await page.evaluate(() => window.__ownerCalls)).toHaveLength(1);
  });

  test('403(권한): 서버 메시지 그대로 표시', async ({ page }) => {
    await openVisit(page);
    await mockError(page, { status: 403, code: 'FORBIDDEN', message: '이 계정은 신청의 점포와 연결되어 있지 않습니다.' });
    await fillCode(page, { code: 'HC-7F3K9Q' });
    await page.getByRole('button', { name: '인증' }).click();
    await expect(page.locator('[data-testid="owner-result"]')).toContainText('이 계정은 신청의 점포와 연결되어 있지 않습니다.');
    await expect(page.locator('[data-code="FORBIDDEN"]')).toBeVisible();
  });
});
