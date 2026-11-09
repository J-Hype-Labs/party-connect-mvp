import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// 게스트 마이페이지: 내 신청 상태 확인 + 미션 URL 제출/재제출.
// 실제 Supabase 를 호출하지 않고 SDK 와 partylink-api 를 mock 한다 (tests/helpers/live-fixture.js).

const app = (over = {}) => ({
  id: 'app-1', partyId: FIXTURE_PARTY.id, partyTitle: FIXTURE_PARTY.title, venue: '테스트 장소', day: '금',
  name: '홍길동', phone: '01012345678', appliedAt: '2026-11-08T03:00:00Z', userId: 'user-1',
  status: 'VISITED', visitCode: null, rejectReason: null, ...over,
});

// 두 페이지의 마이페이지 진입 방법이 다르다: 파티커넥트는 헤더 버튼, 메인은 프로필 메뉴.
async function openMyPage(page, path) {
  if (path === '/') {
    await page.getByRole('button', { name: '프로필 메뉴' }).click();
    await page.getByRole('button', { name: '마이페이지' }).click();
  } else {
    await expect(page.getByRole('button', { name: /마이페이지/ })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: /마이페이지/ }).click();
  }
  const dialog = page.getByRole('dialog', { name: '마이페이지' });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const path of ['/party-connect/', '/']) {
  test.describe(`마이페이지 미션 제출 (${path})`, () => {
    test('상태별 안내 문구가 보이고, 방문 인증 완료 상태에서만 미션 폼이 보인다', async ({ page }) => {
      await loadLive(page, {
        path,
        applications: [
          app({ id: 'a-applied', status: 'APPLIED' }),
          app({ id: 'a-approved', status: 'APPROVED', visitCode: 'ABC123' }),
          app({ id: 'a-visited', status: 'VISITED' }),
          app({ id: 'a-review', status: 'MISSION_SUBMITTED' }),
          app({ id: 'a-rejected', status: 'REJECTED', rejectReason: '정원 초과' }),
        ],
      });
      const dialog = await openMyPage(page, path);

      await expect(dialog.getByText('운영팀이 참여자를 선정하면 알려드려요', { exact: false })).toBeVisible();
      await expect(dialog.getByText('방문 인증 코드:', { exact: false })).toContainText('ABC123');
      await expect(dialog.getByText('미션을 검수하고 있어요', { exact: false })).toBeVisible();
      await expect(dialog.getByText('사유: 정원 초과')).toBeVisible();

      // 미션 폼은 VISITED 신청에만 1개
      await expect(dialog.getByTestId('mission-form')).toHaveCount(1);
      await expect(dialog.locator('#mission-url-a-visited')).toBeVisible();
      await expect(dialog.locator('#mission-url-a-review')).toHaveCount(0);
    });

    test('잘못된 URL 은 서버 호출 없이 막고, 올바른 URL 은 제출되어 검수 중으로 바뀐다', async ({ page }) => {
      const { calls } = await loadLive(page, { path, applications: [app({ id: 'a-visited', status: 'VISITED' })] });
      const dialog = await openMyPage(page, path);
      const input = dialog.locator('#mission-url-a-visited');
      const submit = dialog.getByRole('button', { name: '미션 제출하기' });

      await input.fill('javascript:alert(1)');
      await submit.click();
      await expect(dialog.getByRole('alert')).toContainText('http:// 또는 https://');
      await input.fill('instagram.com/p/abc');
      await submit.click();
      await expect(dialog.getByRole('alert')).toContainText('http:// 또는 https://');
      expect(calls.filter((c) => c.path.endsWith('/mission'))).toHaveLength(0);

      await input.fill('  https://blog.example.test/review/1  ');
      await submit.click();

      // 서버 상태가 MISSION_SUBMITTED 로 바뀌어 다시 조회되고, 폼은 사라진다
      await expect(dialog.getByText('미션을 검수하고 있어요', { exact: false })).toBeVisible();
      await expect(dialog.getByTestId('mission-form')).toHaveCount(0);
      const missionCalls = calls.filter((c) => c.path === 'applications/a-visited/mission');
      expect(missionCalls).toHaveLength(1);
      expect(missionCalls[0].method).toBe('POST');
      expect(missionCalls[0].body).toEqual({ url: 'https://blog.example.test/review/1' });
    });

    test('보완 요청으로 VISITED 로 되돌아온 신청은 새로고침 후 다시 제출할 수 있다', async ({ page }) => {
      const { calls, applications } = await loadLive(page, { path, applications: [app({ id: 'a-1', status: 'VISITED' })] });
      const dialog = await openMyPage(page, path);

      await dialog.locator('#mission-url-a-1').fill('https://blog.example.test/first');
      await dialog.getByRole('button', { name: '미션 제출하기' }).click();
      await expect(dialog.getByTestId('mission-form')).toHaveCount(0);

      // 관리자가 보완을 요청하면 서버에서 MISSION_SUBMITTED -> VISITED
      applications[0].status = 'VISITED';
      await dialog.getByRole('button', { name: '상태 새로고침' }).click();
      await expect(dialog.getByTestId('mission-form')).toHaveCount(1);
      // 서버는 이전 제출값(missionUrl)을 남겨 두므로 '보완 요청됨'으로 표시된다
      await expect(dialog.getByTestId('revision-requested')).toBeVisible();
      await expect(dialog.getByTestId('mission-previous-link')).toHaveAttribute('href', 'https://blog.example.test/first');

      await dialog.locator('#mission-url-a-1').fill('https://blog.example.test/second');
      await dialog.getByRole('button', { name: '미션 제출하기' }).click();
      await expect(dialog.getByTestId('mission-form')).toHaveCount(0);
      expect(calls.filter((c) => c.path === 'applications/a-1/mission').map((c) => c.body.url)).toEqual([
        'https://blog.example.test/first',
        'https://blog.example.test/second',
      ]);
    });

    test('VISITED + missionUrl 은 보완 요청됨, missionUrl 이 없으면 제출 전으로 구분해 그린다', async ({ page }) => {
      await loadLive(page, {
        path,
        applications: [
          app({ id: 'a-first', status: 'VISITED' }),
          app({ id: 'a-revise', status: 'VISITED', missionUrl: 'https://blog.example.test/old', revisionNote: '사진을 더 올려 주세요' }),
          app({ id: 'a-review', status: 'MISSION_SUBMITTED', missionUrl: 'https://blog.example.test/review' }),
          app({ id: 'a-unsafe', status: 'MISSION_SUBMITTED', missionUrl: 'javascript:alert(1)' }),
        ],
      });
      const dialog = await openMyPage(page, path);

      // 제출 전: 배너 없음, 안내 문구만
      await expect(dialog.getByTestId('revision-requested')).toHaveCount(1);
      await expect(dialog.getByText('체험 후기(미션) 링크를 제출해 주세요', { exact: false })).toHaveCount(1);
      // 보완 요청됨: 배너 + 사유 + 이전 링크
      await expect(dialog.getByText('요청 사유: 사진을 더 올려 주세요')).toBeVisible();
      await expect(dialog.getByTestId('mission-previous-link').first()).toHaveAttribute('href', 'https://blog.example.test/old');
      // 검수 중: 제출한 링크 표시, http(s)가 아닌 값은 링크로 만들지 않는다
      await expect(dialog.getByTestId('mission-previous-link')).toHaveCount(2);
      await expect(dialog.locator('a[href^="javascript:"]')).toHaveCount(0);
    });

    test('서버가 거절하면 오류 문구를 보여 주고 폼과 입력값을 유지한다', async ({ page }) => {
      const { applications } = await loadLive(page, { path, applications: [app({ id: 'a-1', status: 'VISITED' })] });
      const dialog = await openMyPage(page, path);
      applications[0].status = 'COMPLETED'; // 서버에서는 이미 다른 상태가 됨 → 409
      await dialog.locator('#mission-url-a-1').fill('https://blog.example.test/late');
      await dialog.getByRole('button', { name: '미션 제출하기' }).click();
      await expect(dialog.getByRole('alert')).toContainText('지금은 미션을 제출할 수 없는 상태');
      await expect(dialog.locator('#mission-url-a-1')).toHaveValue('https://blog.example.test/late');
    });
  });
}
