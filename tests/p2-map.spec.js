import { test, expect } from './helpers/test-base.js';

// G-09 지도 탐색: 카카오 SDK 를 스텁으로 대체해 실제 카카오 호출 없이 검증한다.
// 설계 docs/MAP_EXPLORATION_DESIGN.md §4. 서버 변경 없음(좌표는 브라우저 Geocoder + localStorage 캐시).

const SDK_STUB = `
window.__sdkLoads = (window.__sdkLoads || 0) + 1;
window.__geo = window.__geo || [];
window.__markers = window.__markers || [];
window.kakao = { maps: {
  load: function (cb) { cb(); },
  Map: function () { this.setCenter = function () {}; this.setBounds = function () {}; },
  Marker: function (o) { window.__markers.push(o); this.setMap = function () {}; },
  LatLngBounds: function () { this.extend = function () {}; },
  LatLng: function () {},
  services: { Geocoder: function () {
    this.addressSearch = function (addr, cb) {
      window.__geo.push(addr);
      cb([{ latlng: { lat: 37.5, lng: 127 } }], 'OK');
    };
  } }
} };
`;

const mapRegion = (page) => page.getByRole('region', { name: '업체 지도' });
const mapTab = (page) => page.getByRole('button', { name: '지도', exact: true });
const listTab = (page) => page.getByRole('button', { name: '목록', exact: true });

async function setup(page, { withKey = true, abortSdk = false } = {}) {
  if (abortSdk) {
    await page.route('**/dapi.kakao.com/**', (route) => route.abort());
  } else {
    await page.route('**/dapi.kakao.com/**', (route) => route.fulfill({
      status: 200, contentType: 'application/javascript', body: SDK_STUB,
    }));
  }
  if (withKey) {
    await page.route('**/party-connect/?*', async (route) => {
      const res = await route.fetch();
      let html = (await res.text()).replace(
        /window\.PARTYLINK_CONFIG = \{/,
        'window.PARTYLINK_CONFIG = { kakaoJsKey: "test-key",'
      );
      await route.fulfill({ response: res, body: html });
    });
  }
  await page.goto('/party-connect/?live=0');
}

test.describe('G-09 지도 탐색', () => {
  test('카카오 키가 없으면 지도 탭이 비활성이고 안내가 보인다', async ({ page }) => {
    await setup(page, { withKey: false });
    await expect(mapTab(page)).toBeVisible({ timeout: 30000 });
    await expect(mapTab(page)).toBeDisabled();
    await expect(page.getByText(/카카오맵 키가 없어 지도 탭을 쓸 수 없어요/)).toBeVisible();
    await expect(mapRegion(page)).toHaveCount(0);
  });

  test('지도 탭을 열면 SDK 를 1회 로드하고 같은 주소 파티를 업체 단위로 묶어 마커를 그린다', async ({ page }) => {
    await setup(page);
    await expect(mapTab(page)).toBeEnabled({ timeout: 30000 });
    expect(await page.evaluate(() => window.__sdkLoads || 0)).toBe(0);

    await mapTab(page).click();
    await expect(mapRegion(page)).toBeVisible({ timeout: 20000 });
    await expect.poll(() => page.evaluate(() => (window.__markers || []).length)).toBeGreaterThan(0);

    expect(await page.evaluate(() => window.__sdkLoads)).toBe(1);
    const geoCount = await page.evaluate(() => new Set(window.__geo || []).size);
    const markerCount = await page.evaluate(() => (window.__markers || []).length);
    // 같은 주소는 Geocoder 1회 → 마커 수가 고유 주소 수를 넘지 않는다.
    expect(markerCount).toBeLessThanOrEqual(geoCount);
    expect(geoCount).toBeGreaterThan(0);
  });

  test('목록으로 돌아갔다 다시 열어도 SDK 를 다시 로드하지 않고 좌표 캐시를 재사용한다', async ({ page }) => {
    await setup(page);
    await expect(mapTab(page)).toBeEnabled({ timeout: 30000 });

    await mapTab(page).click();
    await expect(mapRegion(page)).toBeVisible({ timeout: 20000 });
    await expect.poll(() => page.evaluate(() => (window.__markers || []).length)).toBeGreaterThan(0);
    const loads = await page.evaluate(() => window.__sdkLoads);
    const geo1 = await page.evaluate(() => (window.__geo || []).length);

    await listTab(page).click();
    await expect(mapRegion(page)).toHaveCount(0);
    await expect(listTab(page)).toHaveAttribute('aria-pressed', 'true');

    await mapTab(page).click();
    await expect(mapRegion(page)).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__sdkLoads)).toBe(loads);
    // 좌표 캐시 적중 → 새 Geocoder 호출이 없어야 한다.
    expect(await page.evaluate(() => (window.__geo || []).length)).toBe(geo1);
  });

  test('SDK 로드 실패 시 목록으로 폴백하고 안내를 보여 준다', async ({ page }) => {
    await setup(page, { abortSdk: true });
    await expect(mapTab(page)).toBeEnabled({ timeout: 30000 });
    await mapTab(page).click();
    await expect(page.getByText(/지도를 불러오지 못했어요/)).toBeVisible({ timeout: 20000 });
    await expect(listTab(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(mapRegion(page)).toHaveCount(0);
  });

  test('320px 좁은 화면에서 지도가 가로로 넘치지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await setup(page);
    await expect(mapTab(page)).toBeEnabled({ timeout: 30000 });
    await mapTab(page).click();
    await expect(mapRegion(page)).toBeVisible({ timeout: 20000 });
    await expect.poll(() => page.evaluate(() => (window.__markers || []).length)).toBeGreaterThan(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
