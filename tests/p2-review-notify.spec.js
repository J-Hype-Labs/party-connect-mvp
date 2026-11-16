import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// G-22: 후기 작성은 체험 완료(COMPLETED) 신청만 가능 (홈 전용 기능).
// G-21: 사이트 내 알림이 실제 신청 상태 변화(선정·반려·보완 요청·체험 완료)를 반영.
// 실제 Supabase 없이 SDK·partylink-api를 mock한다 (tests/helpers/live-fixture.js).

const app = (over = {}) => ({
  id: 'app-1', partyId: FIXTURE_PARTY.id, partyTitle: FIXTURE_PARTY.title, venue: '테스트 장소', day: '금',
  name: '홍길동', phone: '01012345678', appliedAt: '2026-11-08T03:00:00Z', userId: 'user-1',
  status: 'APPLIED', visitCode: null, rejectReason: null, ...over,
});

const SEEN_KEY = 'partyconnect:seen-statuses:user-1';

async function openPartyDetail(page) {
  await page.getByRole('button', { name: FIXTURE_PARTY.title, exact: true }).first().click();
  await expect(page.getByRole('button', { name: '파티 상세 모달 닫기' })).toBeVisible({ timeout: 30000 });
}

async function openNotificationCenter(page) {
  await page.getByRole('button', { name: /^알림(,|$)/ }).click();
  const dialog = page.getByRole('dialog', { name: '알림' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('G-22 후기 작성 게이트 (홈)', () => {
  test('COMPLETED 신청은 상세에 후기 작성 버튼이 보인다', async ({ page }) => {
    await loadLive(page, { path: '/', applications: [app({ status: 'COMPLETED' })] });
    await openPartyDetail(page);
    await expect(page.getByRole('button', { name: '후기 작성하기' })).toBeVisible();
  });

  for (const status of ['APPLIED', 'APPROVED', 'VISITED', 'MISSION_SUBMITTED']) {
    test(`${status} 신청은 후기 작성 버튼이 없다`, async ({ page }) => {
      await loadLive(page, { path: '/', applications: [app({ status, visitCode: status === 'APPROVED' ? 'ABC123' : null })] });
      await openPartyDetail(page);
      await expect(page.getByRole('button', { name: '후기 작성하기' })).toHaveCount(0);
    });
  }

  test('COMPLETED 신청은 후기를 등록할 수 있다', async ({ page }) => {
    await loadLive(page, { path: '/', applications: [app({ status: 'COMPLETED' })] });
    await openPartyDetail(page);
    await page.getByRole('button', { name: '후기 작성하기' }).click();
    const modal = page.getByRole('dialog', { name: '후기 작성' });
    await expect(modal).toBeVisible();
    await modal.locator('#review-comment').fill('정말 좋은 경험이었어요. 다음에도 참여하고 싶어요.');
    await modal.getByRole('button', { name: '등록' }).click();
    await expect(page.getByText('후기가 등록되었습니다!')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('partyconnect:reviews') || '[]'));
    expect(saved.some((r) => r.comment.includes('정말 좋은 경험이었어요'))).toBe(true);
  });
});

for (const path of ['/', '/party-connect/']) {
  test.describe(`G-21 실제 상태 변화 알림 (${path})`, () => {
    test('최초 조회는 알림 없이 상태만 기록한다', async ({ page }) => {
      await loadLive(page, { path, applications: [app({ status: 'APPROVED', visitCode: 'ABC123' })] });
      await page.waitForFunction((key) => localStorage.getItem(key) !== null, SEEN_KEY);
      const dialog = await openNotificationCenter(page);
      await expect(dialog.getByText('선정 확정')).toHaveCount(0);
      await expect(dialog.getByText('알림이 없습니다.')).toBeVisible();
    });

    const transitions = [
      { from: 'APPLIED', to: 'APPROVED', title: '선정 확정' },
      { from: 'APPLIED', to: 'REJECTED', title: '미선정 안내' },
      { from: 'MISSION_SUBMITTED', to: 'VISITED', title: '보완 요청' },
      { from: 'MISSION_SUBMITTED', to: 'COMPLETED', title: '체험 완료' },
    ];
    for (const t of transitions) {
      test(`${t.from}→${t.to} 변화는 "${t.title}" 알림을 만든다`, async ({ page }) => {
        const { applications } = await loadLive(page, { path, applications: [app({ status: t.from })] });
        await page.waitForFunction((key) => localStorage.getItem(key) !== null, SEEN_KEY);
        // 서버 상태가 바뀐 뒤 게스트가 사이트에 다시 들어온 상황
        applications[0].status = t.to;
        await page.reload();
        await expect(page.getByRole('button', { name: /알림, 1개 읽지 않음/ })).toBeVisible({ timeout: 30000 });
        const dialog = await openNotificationCenter(page);
        await expect(dialog.getByText(t.title)).toBeVisible();
        await expect(dialog.getByText(FIXTURE_PARTY.title, { exact: false }).first()).toBeVisible();
      });
    }
  });
}

test.describe('G-21 알림 중복 방지 (홈)', () => {
  test('같은 상태로 다시 들어오면 알림이 늘지 않는다', async ({ page }) => {
    const { applications, calls } = await loadLive(page, { path: '/', applications: [app({ status: 'APPLIED' })] });
    await page.waitForFunction((key) => localStorage.getItem(key) !== null, SEEN_KEY);
    applications[0].status = 'APPROVED';
    await page.reload();
    await expect(page.getByRole('button', { name: /알림, 1개 읽지 않음/ })).toBeVisible({ timeout: 30000 });

    const getsBefore = calls.filter((c) => c.path === 'applications' && c.method === 'GET').length;
    await page.reload();
    await expect.poll(() => calls.filter((c) => c.path === 'applications' && c.method === 'GET').length, { timeout: 30000 }).toBeGreaterThan(getsBefore);
    await page.waitForTimeout(300); // 상태 조회 후 알림 이펙트 반영 여유

    await expect(page.getByRole('button', { name: /알림, 1개 읽지 않음/ })).toBeVisible();
    const dialog = await openNotificationCenter(page);
    await expect(dialog.getByText('선정 확정')).toHaveCount(1);
  });
});
