import { test, expect } from './helpers/test-base.js';
import { loadLive, FIXTURE_PARTY } from './helpers/live-fixture.js';

// G-17: 이름·연락처 기본값 저장/프리필 검증
// 게스트가 신청서(이름·연락처) 제출 시 localStorage 'partyconnect:profile'에 저장
// 다음 신청서 열 때 저장된 프로필로 이름·연락처 프리필 (여전히 편집 가능)

const PAGES = ['/', '/party-connect/'];
const VIEWPORTS = [
  { name: '320px', width: 320, height: 640 },
  { name: '1440px', width: 1440, height: 900 },
];

// 두 번째 신청(프리필 검증)용 다른 파티. 같은 파티는 중복 신청이 차단되므로 별도 파티를 사용한다.
const FIXTURE_PARTY_2 = { ...FIXTURE_PARTY, id: 'b267ab8e-1743-49d4-bb74-7c1accb1fa91', title: '서버 전용 테스트 파티 2' };

async function openFormForParty(page, party) {
  const card = page.locator(`article[data-party-id="${party.id}"]`);
  await expect(card).toBeVisible({ timeout: 30000 });
  await card.getByRole('button', { name: party.title }).click();
  const detailDialog = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
  await expect(detailDialog).toBeVisible();
  const applyBtn = detailDialog.getByRole('button', { name: '파티 신청하기' });
  await expect(applyBtn).toBeVisible();
  await applyBtn.click();
  const formDialog = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');
  await expect(formDialog.getByRole('heading', { name: '파티 신청' })).toBeVisible({ timeout: 5000 });
  return formDialog;
}

async function openPartyDetailAndForm(page, path, party = FIXTURE_PARTY) {
  await loadLive(page, { path, parties: [FIXTURE_PARTY, FIXTURE_PARTY_2], signedIn: true, applications: [] });
  return openFormForParty(page, party);
}

for (const path of PAGES) {
  test.describe(`G-17 프로필 프리필 ${path}`, () => {
    for (const vp of VIEWPORTS) {
      test.describe(`${vp.name}`, () => {
        test.beforeEach(async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          // 각 테스트마다 localStorage 초기화
          await page.addInitScript(() => {
            localStorage.removeItem('partyconnect:profile');
          });
        });

        test('첫 신청 시 localStorage에 partyconnect:profile 저장됨', async ({ page }) => {
          const formDialog = await openPartyDetailAndForm(page, path);

          // 이름, 연락처 입력
          await page.fill('#apply-name', '김테스트');
          await page.fill('#apply-phone', '010-1234-5678');
          await page.locator('input[name="apply-day"][value="금"]').click();
          await page.locator('input[type="checkbox"]').click();

          // 신청하기 제출
          await formDialog.getByRole('button', { name: '신청하기' }).click();

          // 신청 완료 모달 확인
          await expect(formDialog.getByRole('heading', { name: '신청이 접수되었습니다!' })).toBeVisible({ timeout: 5000 });

          // localStorage에 profile 저장되었는지 확인
          const saved = await page.evaluate(() => localStorage.getItem('partyconnect:profile'));
          expect(saved).toBeTruthy();
          const profile = JSON.parse(saved);
          expect(profile.name).toBe('김테스트');
          expect(profile.phone).toBe('01012345678');
          expect(profile.savedAt).toBeTruthy();
        });

        test('두 번째 신청 시 저장된 프로필로 프리필됨 (편집 가능)', async ({ page }) => {
          // 첫 번째 신청 완료 (localStorage에 저장)
          const formDialog1 = await openPartyDetailAndForm(page, path);
          await page.fill('#apply-name', '김테스트');
          await page.fill('#apply-phone', '010-1234-5678');
          await page.locator('input[name="apply-day"][value="금"]').click();
          await page.locator('input[type="checkbox"]').click();
          await formDialog1.getByRole('button', { name: '신청하기' }).click();
          await expect(formDialog1.getByRole('heading', { name: '신청이 접수되었습니다!' })).toBeVisible({ timeout: 5000 });

          // 모달 닫기
          await formDialog1.getByRole('button', { name: '확인' }).click();
          await expect(formDialog1).toBeHidden();

          // 두 번째 신청은 다른 파티로 진입(같은 파티는 중복 신청 차단). 저장된 프로필이 프리필되어야 한다.
          const formDialog2 = await openFormForParty(page, FIXTURE_PARTY_2);
          const detailDialog2 = page.locator('[role="dialog"][aria-labelledby="party-detail-title"]');

          // 프리필되었는지 확인
          // 프리필은 폼이 열린 뒤 useEffect로 적용되므로 자동 재시도 단언으로 적용 완료를 대기한다.
          await expect(page.locator('#apply-name')).toHaveValue('김테스트');
          await expect(page.locator('#apply-phone')).toHaveValue('01012345678');

          // 여전히 편집 가능해야 함
          await page.fill('#apply-name', '이수정');
          await page.fill('#apply-phone', '010-9999-8888');
          const newNameValue = await page.inputValue('#apply-name');
          const newPhoneValue = await page.inputValue('#apply-phone');
          expect(newNameValue).toBe('이수정');
          // 입력란은 타이핑한 값 그대로 표시(하이픈 유지). 숫자 정규화는 제출 시에만 일어난다.
          expect(newPhoneValue).toBe('010-9999-8888');

          // 취소하고 모달 닫기
          await formDialog2.getByRole('button', { name: '취소' }).click();
          await expect(detailDialog2).toBeVisible();
          await detailDialog2.getByRole('button', { name: /파티 상세 모달 닫기/ }).click();
        });

        test('프로필 저장 키 이름이 partyconnect:profile로 고정됨 (기존 키 변경 금지)', async ({ page }) => {
          const formDialog = await openPartyDetailAndForm(page, path);
          await page.fill('#apply-name', '테스트유저');
          await page.fill('#apply-phone', '010-1111-2222');
          await page.locator('input[name="apply-day"][value="금"]').click();
          await page.locator('input[type="checkbox"]').click();
          await formDialog.getByRole('button', { name: '신청하기' }).click();
          await expect(formDialog.getByRole('heading', { name: '신청이 접수되었습니다!' })).toBeVisible({ timeout: 5000 });

          // 정확한 키 이름으로 저장되었는지 확인
          const keys = await page.evaluate(() => Object.keys(localStorage));
          expect(keys).toContain('partyconnect:profile');

          // 다른 파티커넥트 키들과 함께 존재해야 함 (기존 데이터 보존).
          // 실서비스 모드에서 신청 내역은 서버에 저장되므로 localStorage에는 wishlist 키만 남는다.
          expect(keys).toContain('partyconnect:wishlist');
        });

        test('민감정보(주민번호 등) 수집하지 않음 - 이름/연락처만 저장', async ({ page }) => {
          const formDialog = await openPartyDetailAndForm(page, path);
          await page.fill('#apply-name', '테스트');
          await page.fill('#apply-phone', '010-1234-5678');
          await page.locator('input[name="apply-day"][value="금"]').click();
          await page.locator('input[type="checkbox"]').click();
          await formDialog.getByRole('button', { name: '신청하기' }).click();
          await expect(formDialog.getByRole('heading', { name: '신청이 접수되었습니다!' })).toBeVisible({ timeout: 5000 });

          const saved = await page.evaluate(() => localStorage.getItem('partyconnect:profile'));
          const profile = JSON.parse(saved);
          // 저장된 필드가 name, phone, savedAt만 있는지 확인
          expect(Object.keys(profile).sort()).toEqual(['name', 'phone', 'savedAt']);
          expect(profile.name).toBe('테스트');
          expect(profile.phone).toBe('01012345678');
        });
      });
    }
  });
}