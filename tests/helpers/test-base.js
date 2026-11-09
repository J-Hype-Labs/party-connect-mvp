import { test as base, expect } from '@playwright/test';

// 모든 E2E 테스트가 공유하는 test 확장.
// 기능 검증에는 애니메이션이 필요 없고, 느린 Linux WebKit(CI)에서는 슬라이드/페이드 애니메이션과
// `scroll-behavior: smooth` 때문에 Playwright 의 "stable" 검사가 끝나지 않아 클릭이 시간 초과된다.
// 그래서 문서가 만들어질 때마다 모션을 끄는 스타일을 주입한다 (페이지 이동·새로고침 후에도 유지).
const NO_MOTION_CSS = [
  '*, *::before, *::after {',
  '  animation-duration: 0s !important; animation-delay: 0s !important;',
  '  transition-duration: 0s !important; transition-delay: 0s !important;',
  '  scroll-behavior: auto !important;',
  '}',
].join('\n');

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((css) => {
      const inject = () => {
        if (document.querySelector('style[data-e2e="no-motion"]')) return;
        const style = document.createElement('style');
        style.setAttribute('data-e2e', 'no-motion');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
      else inject();
    }, NO_MOTION_CSS);
    await use(page);
  },
});

export { expect };
