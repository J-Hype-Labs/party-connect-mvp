import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// L-06 접근성 점검: 두 페이지에서 ARIA 레이블, 포커스 관리, 모션 감소 등 검증
const PAGES = ['/', '/party-connect/'];
const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '375px', width: 375, height: 667 },
  { name: '390px', width: 390, height: 844 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1280px', width: 1280, height: 800 },
  { name: '1440px', width: 1440, height: 900 },
];

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(overflow.doc, 'document 가로 넘침').toBeLessThanOrEqual(0);
  expect(overflow.body, 'body 가로 넘침').toBeLessThanOrEqual(0);
}

for (const path of PAGES) {
  test.describe(`P2 접근성 ${path}`, () => {
    for (const vp of VIEWPORTS) {
      test.describe(`${vp.name}`, () => {
        test.beforeEach(async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
        });

        test('아이콘 버튼에 접근성 이름(aria-label)이 있다', async ({ page }) => {
          await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
          await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });

          // 알림 벨
          const bell = page.getByRole('button', { name: /알림/ });
          await expect(bell).toBeVisible();
          const bellLabel = await bell.getAttribute('aria-label');
          expect(bellLabel).toBeTruthy();

          // 파티 카드 클릭 → 상세 모달 열기
          await page.locator('article[data-party-id]').first().getByRole('button', { name: FIXTURE_PARTY.title }).click();
          const detailDialog = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
          await expect(detailDialog).toBeVisible();

          // 상세 모달 닫기 버튼
          const closeBtn = detailDialog.getByRole('button', { name: /파티 상세 모달 닫기/ });
          await expect(closeBtn).toBeVisible();
          const closeLabel = await closeBtn.getAttribute('aria-label');
          expect(closeLabel).toBeTruthy();

          // 이전/다음 이미지 버튼 (이미지가 여러 개인 경우)
          const prevBtn = detailDialog.getByRole('button', { name: '이전 이미지' });
          const nextBtn = detailDialog.getByRole('button', { name: '다음 이미지' });
          if (await prevBtn.isVisible().catch(() => false)) {
            await expect(prevBtn).toHaveAttribute('aria-label', '이전 이미지');
          }
          if (await nextBtn.isVisible().catch(() => false)) {
            await expect(nextBtn).toHaveAttribute('aria-label', '다음 이미지');
          }

          await closeBtn.click();
          await expect(detailDialog).toBeHidden();
        });

        test('필터 칩 터치 타깃 ≥ 44px', async ({ page }) => {
          await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
          await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });

          const categoryChips = page.getByRole('group', { name: '카테고리 필터' }).getByRole('button');
          await expect(categoryChips.first()).toBeVisible();
          const box = await categoryChips.first().boundingBox();
          expect(box).not.toBeNull();
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);

          const dayChips = page.getByRole('group', { name: '요일 필터' }).getByRole('button');
          await expect(dayChips.first()).toBeVisible();
          const dayBox = await dayChips.first().boundingBox();
          expect(dayBox).not.toBeNull();
          expect(dayBox.height).toBeGreaterThanOrEqual(44);
          expect(dayBox.width).toBeGreaterThanOrEqual(44);

          const dateChips = page.getByRole('group', { name: '날짜 필터' }).getByRole('button');
          await expect(dateChips.first()).toBeVisible();
          const dateBox = await dateChips.first().boundingBox();
          expect(dateBox).not.toBeNull();
          expect(dateBox.height).toBeGreaterThanOrEqual(44);
          expect(dateBox.width).toBeGreaterThanOrEqual(44);
        });

        test('가로 스크롤 없음', async ({ page }) => {
          await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
          await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });
          await expectNoHorizontalOverflow(page);
        });

        test('모달 열 때 포커스 이동, 닫을 때 포커스 복귀', async ({ page }) => {
          await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
          await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });

          // 지역 선택 모달 열기
          const regionBtn = page.getByRole('button', { name: /지역/ });
          // 키보드 사용자가 트리거에 포커스한 뒤 활성화하는 실제 접근성 시나리오로 검증한다.
          // Safari/WebKit은 마우스 클릭 시 버튼에 포커스를 주지 않으므로 focus+Enter로 활성화한다.
          await regionBtn.focus();
          await page.keyboard.press('Enter');
          const regionDialog = page.getByRole('dialog', { name: '지역 선택' });
          await expect(regionDialog).toBeVisible();

          // 포커스가 모달 내부(닫기 버튼 또는 첫 탭)로 이동했는지 확인
          const closeBtn = regionDialog.getByRole('button', { name: /지역 선택 모달 닫기/ });
          await expect(closeBtn).toBeFocused();

          // ESC로 닫기
          await page.keyboard.press('Escape');
          await expect(regionDialog).toBeHidden();

          // 포커스가 트리거(지역 버튼)로 복귀했는지 확인
          await expect(regionBtn).toBeFocused();
        });

        test('prefers-reduced-motion 존중: 애니메이션 비활성화', async ({ page }) => {
          // prefers-reduced-motion 미디어 쿼리 설정
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
          await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });

          // 애니메이션 관련 클래스가 none으로 설정되었는지 확인
          const hasNoAnimation = await page.evaluate(() => {
            const style = window.getComputedStyle(document.documentElement);
            return style.scrollBehavior === 'auto';
          });
          expect(hasNoAnimation).toBeTruthy();
        });

        test('색상만으로 상태 전달하지 않음: 텍스트/아이콘 함께 표시', async ({ page }) => {
          await loadLive(page, { path, parties: [FIXTURE_PARTY], signedIn: false });
          await expect(page.locator('article[data-party-id]').first()).toBeVisible({ timeout: 30000 });

          // 모집 상태 배지: 텍스트로 "모집 중" 또는 "모집 마감" 표시 확인
          const statusBadge = page.locator('article[data-party-id]').first().locator('span:has-text("모집")').first();
          await expect(statusBadge).toBeVisible();
          const badgeText = await statusBadge.textContent();
          expect(badgeText).toMatch(/모집/);
        });
      });
    }
  });
}