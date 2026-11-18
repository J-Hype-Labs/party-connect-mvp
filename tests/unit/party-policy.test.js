/**
 * PartyPolicy 단위 테스트
 * Node.js에서 실행: node tests/unit/party-policy.test.js
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

function loadModule() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(__dirname, '../../js/party-policy.js'), 'utf8');
  vm.runInContext(code, sandbox);
  return sandbox.window.PartyPolicy;
}

console.log('--- 노출 계약 ---');
{
  const P = loadModule();
  assertTrue(!!P, 'window.PartyPolicy 노출');
  assertTrue(Array.isArray(P.SELECTION_CRITERIA), 'SELECTION_CRITERIA 배열');
  assertTrue(Array.isArray(P.REVIEW_CHECKLIST), 'REVIEW_CHECKLIST 배열');
  assertEqual(typeof P.NOSHOW_NOTICE, 'string', 'NOSHOW_NOTICE 문자열');
  assertEqual(typeof P.REVISION_LIMIT, 'string', 'REVISION_LIMIT 문자열');
}

console.log('\n--- Q-08 선정 기준 (상세 공개) ---');
{
  const P = loadModule();
  assertEqual(P.SELECTION_CRITERIA.length, 3, '기준 3단계');
  assertTrue(P.SELECTION_CRITERIA[0].includes('차단·노쇼 이력'), '① 차단·노쇼 이력 없는 사람 우선');
  assertTrue(P.SELECTION_CRITERIA[1].includes('SNS'), '② SNS 계정 보유 우선');
  assertTrue(P.SELECTION_CRITERIA[2].includes('신청이 빠른 순'), '③ 신청이 빠른 순');
  P.SELECTION_CRITERIA.forEach((t) => assertTrue(t.length > 0 && t.length <= 120, '기준 문구 길이 적정'));
}

console.log('\n--- Q-16 노쇼 제한 안내 ---');
{
  const P = loadModule();
  assertTrue(P.NOSHOW_NOTICE.includes('30일'), '노쇼 누적 시 30일 신청 제한 명시');
  assertTrue(P.NOSHOW_NOTICE.includes('노쇼'), '노쇼 용어 포함');
  assertTrue(P.NOSHOW_NOTICE.length <= 160, '한 줄 안내 길이 적정');
}

console.log('\n--- Q-21 검수 체크리스트 ---');
{
  const P = loadModule();
  assertEqual(P.REVIEW_CHECKLIST.length, 4, '검수 항목 4개');
  assertTrue(P.REVIEW_CHECKLIST[0].includes('링크'), '① 링크가 열림');
  assertTrue(P.REVIEW_CHECKLIST[1].includes('방문'), '② 해당 매장 방문 후기');
  assertTrue(P.REVIEW_CHECKLIST[2].includes('사진') && P.REVIEW_CHECKLIST[2].includes('해시태그'), '③ 사진 수·해시태그');
  assertTrue(P.REVIEW_CHECKLIST[3].includes('협찬 표시'), '④ 협찬 표시(Q-25)');
  assertTrue(P.REVISION_LIMIT.includes('2회'), '보완 요청 최대 2회 명시');
}

console.log('\n--- 문구 안전성 ---');
{
  const P = loadModule();
  const all = P.SELECTION_CRITERIA.concat(P.REVIEW_CHECKLIST, [P.NOSHOW_NOTICE, P.REVISION_LIMIT]);
  assertEqual(all.filter((t) => /<[a-z]|>/.test(t)).length, 0, '문구에 HTML 태그 없음(React 텍스트로만 렌더)');
  assertEqual(all.filter((t) => t.trim() !== t).length, 0, '문구 앞뒤 공백 없음');
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
