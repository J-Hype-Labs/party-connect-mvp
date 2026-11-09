import { test, expect } from '@playwright/test';
import { loadLive } from './helpers/live-fixture.js';

// Front-end contract tests. These deliberately target the existing home page,
// not the PartyConnect subpage being developed in a separate UI branch.
// 카드는 <article role="listitem"> 이고, 카드 안의 "파티 신청하기" 버튼이 상세를 연다.
// (카드의 첫 버튼은 찜하기 아이콘이라 상세를 열지 않는다.)
const partyCards = (page) => page.locator('section#parties article[role="listitem"]');
const cardOpener = (card) => card.getByRole('button', { name: '파티 신청하기' });
const partyDialog = (page) =>
  page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');

test.describe('PartyConnect user journey regression', () => {
  test('clicking a party card actually opens its detail dialog and can close it (demo mode)', async ({ page }) => {
    await page.goto('/');
    await expect(partyCards(page).first()).toBeVisible({ timeout: 30_000 });

    const card = partyCards(page).first();
    const opener = cardOpener(card);
    const dialog = partyDialog(page);
    const cardText = await card.innerText();

    await opener.click();

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('#party-detail-title')).toBeVisible();
    // 현재 상세 화면은 "장소 / 일정 / 주소" 같은 항목 이름을 콜론 없이 보여 준다.
    await expect(dialog).toContainText('장소');
    await expect(dialog).toContainText('일정');
    await expect(dialog).toContainText('주소');
    expect(cardText.trim()).not.toBe('');

    await dialog.getByRole('button', { name: '상세 닫기' }).click();
    await expect(dialog).toBeHidden();

    await opener.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  // 신청은 로그인이 필요하고 데모 모드에서는 카카오 로그인이 비활성이다.
  // 로그인된 세션과 API 를 mock 한 실서비스(live) 화면으로 검증한다. 실제 계정·DB 는 호출하지 않는다.
  test('application requires valid form data, reaches the API once, and survives a reload (live, signed in)', async ({ page }) => {
    const { calls } = await loadLive(page);
    await expect(partyCards(page).first()).toContainText('서버 전용 테스트 파티', { timeout: 30_000 });

    const dialog = partyDialog(page);
    await cardOpener(partyCards(page).first()).click();
    await expect(dialog).toBeVisible();

    const apply = dialog.getByRole('button', { name: /^(무료 체험단 신청하기|파티 신청하기)$/ });
    await expect(apply).toBeEnabled();
    await apply.click();

    await expect(dialog.locator('#apply-name')).toBeVisible();
    await expect(dialog.locator('#apply-phone')).toBeVisible();
    await expect(dialog.locator('input[name="apply-day"]').first()).toBeVisible();

    // 비어 있는 폼은 브라우저 필수 입력 검사에서 막혀 서버로 가지 않는다.
    await dialog.getByRole('button', { name: '신청하기', exact: true }).click();
    expect(calls.filter((c) => c.method === 'POST' && c.path === 'applications').length).toBe(0);

    // 형식이 틀린 이름은 화면의 검증 메시지로 막는다.
    await dialog.locator('#apply-name').fill('김');
    await dialog.locator('#apply-phone').fill('01012345678');
    await dialog.locator('input[name="apply-day"]').first().check();
    await dialog.locator('input[type="checkbox"]').check();
    await dialog.getByRole('button', { name: '신청하기', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('이름을');
    expect(calls.filter((c) => c.method === 'POST' && c.path === 'applications').length).toBe(0);

    await dialog.locator('#apply-name').fill('테스트 사용자');
    await dialog.getByRole('button', { name: '신청하기', exact: true }).click();

    await expect(dialog.getByRole('heading', { name: '신청이 접수되었습니다!' })).toBeVisible();
    expect(calls.filter((c) => c.method === 'POST' && c.path === 'applications').length).toBe(1);
    await dialog.getByRole('button', { name: '확인' }).click();
    await expect(dialog).toBeHidden();

    // 새로고침 후에도 서버의 신청 내역을 읽어 "신청 완료" 상태가 유지된다.
    await page.reload();
    await expect(partyCards(page).first()).toBeVisible({ timeout: 30_000 });
    await expect(partyCards(page).first().getByRole('button', { name: '신청 완료' })).toBeDisabled();
  });

  test('signed-out visitors are asked to log in instead of applying (live)', async ({ page }) => {
    const { calls } = await loadLive(page, { signedIn: false });
    await expect(partyCards(page).first()).toContainText('서버 전용 테스트 파티', { timeout: 30_000 });
    const dialog = partyDialog(page);
    await cardOpener(partyCards(page).first()).click();
    await dialog.getByRole('button', { name: /^(무료 체험단 신청하기|파티 신청하기)$/ }).click();
    await dialog.locator('#apply-name').fill('테스트 사용자');
    await dialog.locator('#apply-phone').fill('01012345678');
    await dialog.locator('input[name="apply-day"]').first().check();
    await dialog.locator('input[type="checkbox"]').check();
    await dialog.getByRole('button', { name: '신청하기', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('로그인');
    expect(calls.filter((c) => c.method === 'POST' && c.path === 'applications').length).toBe(0);
  });
});
