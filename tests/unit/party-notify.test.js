/**
 * PartyNotify 단위 테스트
 * Node.js에서 실행: node tests/unit/party-notify.test.js
 * 의존성: 내장 모듈만 사용 (assert, fs, vm)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(actual, expected, message) {
  try {
    assert.strictEqual(actual, expected);
    console.log(`  ✅ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${message}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
    failures.push({ message, expected, actual, error: e.message });
  }
}

function assertDeepEqual(actual, expected, message) {
  try {
    // VM 컨텍스트에서 생성된 객체는 프로토타입이 달라 deepStrictEqual이 실패한다 → JSON 왕복으로 호스트 렐름화.
    assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);
    console.log(`  ✅ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${message}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Actual:   ${JSON.stringify(actual)}`);
    failed++;
    failures.push({ message, expected, actual, error: e.message });
  }
}

function assertTrue(value, message) {
  try {
    assert.strictEqual(value, true);
    console.log(`  ✅ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${message}`);
    failed++;
    failures.push({ message, expected: true, actual: value, error: e.message });
  }
}

// localStorage mock + 모듈 적재
function loadModule(store) {
  const localStorageMock = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  };
  const sandbox = { window: {}, localStorage: localStorageMock, console };
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(__dirname, '../../js/party-notify.js'), 'utf8');
  vm.runInContext(code, sandbox);
  return { PartyNotify: sandbox.window.PartyNotify, store };
}

const app = (over = {}) => ({ id: 'app-1', partyId: 'party-1', partyTitle: '테스트 파티', status: 'APPLIED', ...over });

console.log('--- buildEvents: 최초 조회(이전 기록 없음) ---');
{
  const { PartyNotify } = loadModule({});
  const r = PartyNotify.buildEvents({}, [app({ status: 'APPROVED' })]);
  assertEqual(r.events.length, 0, '최초 조회는 알림 없이 상태만 기록');
  assertDeepEqual(r.nextSeen, { 'app-1': 'APPROVED' }, 'nextSeen에 현재 상태 기록');
}

console.log('\n--- buildEvents: 상태 변화 알림 ---');
{
  const { PartyNotify } = loadModule({});
  const sel = PartyNotify.buildEvents({ 'app-1': 'APPLIED' }, [app({ status: 'APPROVED' })]);
  assertEqual(sel.events.length, 1, 'APPLIED→APPROVED 알림 1건');
  assertEqual(sel.events[0].title, '선정 확정', '선정 알림 제목');
  assertEqual(sel.events[0].type, 'selection', '선정 알림 타입');
  assertTrue(sel.events[0].message.includes('"테스트 파티"'), '알림 본문에 파티 제목 포함');

  const rej = PartyNotify.buildEvents({ 'app-1': 'APPLIED' }, [app({ status: 'REJECTED' })]);
  assertEqual(rej.events[0].title, '미선정 안내', 'APPLIED→REJECTED 반려 알림');

  const done = PartyNotify.buildEvents({ 'app-1': 'MISSION_SUBMITTED' }, [app({ status: 'COMPLETED' })]);
  assertEqual(done.events[0].title, '체험 완료', 'MISSION_SUBMITTED→COMPLETED 최종 승인 알림');

  const rev = PartyNotify.buildEvents({ 'app-1': 'MISSION_SUBMITTED' }, [app({ status: 'VISITED' })]);
  assertEqual(rev.events[0].title, '보완 요청', 'MISSION_SUBMITTED→VISITED 되돌림은 보완 요청 알림');
  assertEqual(rev.events[0].type, 'revision', '보완 요청 타입');
}

console.log('\n--- buildEvents: 알림 없는 전이 ---');
{
  const { PartyNotify } = loadModule({});
  assertEqual(PartyNotify.buildEvents({ 'app-1': 'APPLIED' }, [app({ status: 'APPLIED' })]).events.length, 0, '같은 상태 유지 → 알림 없음');
  assertEqual(PartyNotify.buildEvents({ 'app-1': 'APPLIED' }, [app({ status: 'VISITED' })]).events.length, 0, 'APPLIED→VISITED(방문 인증)는 G-20 목록 밖 → 알림 없음');
  assertEqual(PartyNotify.buildEvents({ 'app-1': 'APPROVED' }, [app({ status: 'NOSHOW' })]).events.length, 0, 'NOSHOW 전이는 알림 없음');
  assertEqual(PartyNotify.buildEvents({ 'app-1': 'APPLIED' }, [app({ status: 'CANCELLED' })]).events.length, 0, 'CANCELLED 전이는 알림 없음(본인 취소)');
  assertEqual(PartyNotify.buildEvents({ 'app-1': 'VISITED' }, [app({ status: 'MISSION_SUBMITTED' })]).events.length, 0, '미션 제출(본인 행위)은 알림 없음');
}

console.log('\n--- buildEvents: 입력 방어 ---');
{
  const { PartyNotify } = loadModule({});
  assertDeepEqual(PartyNotify.buildEvents(null, [app()]).nextSeen, { 'app-1': 'APPLIED' }, 'seen null → 빈 기록으로 처리');
  assertEqual(PartyNotify.buildEvents({}, null).events.length, 0, 'applications null → 빈 결과');
  assertEqual(PartyNotify.buildEvents({}, [null, undefined, {}]).events.length, 0, 'id 없는 항목은 건너뜀');
  const lower = PartyNotify.buildEvents({ 'app-1': 'applied' }, [app({ status: 'approved' })]);
  assertEqual(lower.events.length, 1, '소문자 상태도 대문자로 정규화해 비교');
  const noTitle = PartyNotify.buildEvents({ 'app-1': 'APPLIED' }, [app({ status: 'APPROVED', partyTitle: '' })]);
  assertTrue(!noTitle.events[0].message.includes('""'), '파티 제목 없으면 빈 따옴표 없이 본문만');
  const multi = PartyNotify.buildEvents(
    { a: 'APPLIED', b: 'MISSION_SUBMITTED', c: 'APPLIED' },
    [app({ id: 'a', status: 'APPROVED' }), app({ id: 'b', status: 'VISITED' }), app({ id: 'c', status: 'APPLIED' })]
  );
  assertEqual(multi.events.length, 2, '여러 신청 중 변화한 건만 알림(a 선정, b 보완)');
  assertDeepEqual(multi.nextSeen, { a: 'APPROVED', b: 'VISITED', c: 'APPLIED' }, 'nextSeen은 현재 목록 전체 상태');
}

console.log('\n--- loadSeen / saveSeen ---');
{
  const { PartyNotify, store } = loadModule({});
  PartyNotify.saveSeen('user-1', { 'app-1': 'APPLIED' });
  assertEqual(store['partyconnect:seen-statuses:user-1'], '{"app-1":"APPLIED"}', '사용자별 키로 저장');
  assertDeepEqual(PartyNotify.loadSeen('user-1'), { 'app-1': 'APPLIED' }, '저장값 왕복 복원');
  assertDeepEqual(PartyNotify.loadSeen('user-2'), {}, '다른 사용자는 빈 기록');
  store['partyconnect:seen-statuses:broken'] = '{invalid json';
  assertDeepEqual(PartyNotify.loadSeen('broken'), {}, '손상된 JSON → 빈 기록(오류 없음)');
  store['partyconnect:seen-statuses:arr'] = '[1,2]';
  assertDeepEqual(PartyNotify.loadSeen('arr'), {}, '배열 등 객체 아닌 값 → 빈 기록');
}

console.log('\n========== 테스트 결과 요약 ==========');
console.log(`통과: ${passed}`);
console.log(`실패: ${failed}`);
console.log(`총계: ${passed + failed}`);

if (failed > 0) {
  console.log('\n--- 실패 상세 ---');
  failures.forEach((f, i) => {
    console.log(`${i + 1}. ${f.message}`);
    console.log(`   Expected: ${JSON.stringify(f.expected)}`);
    console.log(`   Actual:   ${JSON.stringify(f.actual)}`);
  });
  console.log('\n❌ 일부 테스트 실패');
  process.exit(1);
} else {
  console.log('\n✅ 모든 테스트 통과');
  process.exit(0);
}
