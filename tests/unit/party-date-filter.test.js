/**
 * PartyDateFilter 단위 테스트
 * 실행: node tests/unit/party-date-filter.test.js
 * 의존성: assert, fs, vm (Node.js 내장)
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 테스트 결과 추적
let passed = 0;
let failed = 0;
const failures = [];

function assertEqual(actual, expected, message) {
  try {
    // vm 컨텍스트 객체 비교를 위해 JSON 직렬화 비교 사용
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error('Values not equal: ' + actualStr + ' !== ' + expectedStr);
    }
    passed++;
    console.log('  ✓ ' + message);
  } catch (e) {
    failed++;
    failures.push({ message, actual, expected, error: e.message });
    console.log('  ✗ ' + message);
    console.log('    Expected:', JSON.stringify(expected));
    console.log('    Actual:', JSON.stringify(actual));
  }
}

function assertTrue(value, message) {
  try {
    assert.strictEqual(value, true);
    passed++;
    console.log('  ✓ ' + message);
  } catch (e) {
    failed++;
    failures.push({ message, actual: value, expected: true, error: e.message });
    console.log('  ✗ ' + message);
    console.log('    Expected: true');
    console.log('    Actual:', JSON.stringify(value));
  }
}

function assertFalse(value, message) {
  try {
    assert.strictEqual(value, false);
    passed++;
    console.log('  ✓ ' + message);
  } catch (e) {
    failed++;
    failures.push({ message, actual: value, expected: false, error: e.message });
    console.log('  ✗ ' + message);
    console.log('    Expected: false');
    console.log('    Actual:', JSON.stringify(value));
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    failed++;
    failures.push({ message, error: 'Expected to throw but did not' });
    console.log('  ✗ ' + message + ' (expected throw)');
  } catch (e) {
    passed++;
    console.log('  ✓ ' + message);
  }
}

// window 스텁 생성
const windowStub = {};

// party-date-filter.js 로드
const filterPath = __dirname + '/../../js/party-date-filter.js';
const filterCode = fs.readFileSync(filterPath, 'utf-8');

// vm 컨텍스트에서 실행 (window에 PartyDateFilter 바인딩)
const context = vm.createContext({
  window: windowStub,
  console: console,
  Intl: Intl,
  Date: Date,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Map: Map,
  Set: Set,
  Promise: Promise,
  JSON: JSON,
  Math: Math,
  RegExp: RegExp,
  Error: Error,
  TypeError: TypeError,
  ReferenceError: ReferenceError,
  RangeError: RangeError,
  SyntaxError: SyntaxError,
  URIError: URIError,
  eval: eval,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  decodeURI: decodeURI,
  decodeURIComponent: decodeURIComponent,
  encodeURI: encodeURI,
  encodeURIComponent: encodeURIComponent,
  Object: Object,
  Function: Function,
  Symbol: Symbol,
  Reflect: Reflect,
  Proxy: Proxy,
  WeakMap: WeakMap,
  WeakSet: WeakSet
});

vm.runInContext(filterCode, context);

const PartyDateFilter = windowStub.PartyDateFilter;

// 테스트 시작
console.log('\n=== PartyDateFilter Unit Tests ===\n');

// 기준 refDate: 2026-11-16T00:00:00+09:00 (월요일)
// 그 주: 월 11/16 ~ 일 11/22
// 주말: 토 11/21, 일 11/22
const REF_DATE = '2026-11-16T00:00:00+09:00';

// 테스트용 파티 데이터
const realPartySat = {
  id: '1',
  title: 'Saturday Party',
  startsAt: '2026-11-21T19:00:00+09:00', // 토요일
  isExample: false
};

const realPartyWed = {
  id: '2',
  title: 'Wednesday Party',
  startsAt: '2026-11-18T19:00:00+09:00', // 수요일
  isExample: false
};

const realPartyNextWed = {
  id: '3',
  title: 'Next Wednesday Party',
  startsAt: '2026-11-25T19:00:00+09:00', // 다음 주 수요일
  isExample: false
};

const realPartyKstBoundary = {
  id: '4',
  title: 'KST Boundary Party',
  startsAt: '2026-11-20T16:00:00Z', // UTC 16:00 = KST 11/21 01:00 (토)
  isExample: false
};

const examplePartyFriSat = {
  id: 'example-1',
  title: 'Example Fri-Sat',
  days: ['금', '토'],
  isExample: true
};

const examplePartyMonTue = {
  id: 'example-2',
  title: 'Example Mon-Tue',
  days: ['월', '화'],
  isExample: true
};

const examplePartySatOnly = {
  id: 'example-3',
  title: 'Example Sat Only',
  days: ['토'],
  isExample: true
};

const allParties = [
  realPartySat,
  realPartyWed,
  realPartyNextWed,
  realPartyKstBoundary,
  examplePartyFriSat,
  examplePartyMonTue,
  examplePartySatOnly
];

console.log('--- kstDateParts ---');

// kstDateParts 기본 테스트
{
  const result = PartyDateFilter.kstDateParts('2026-11-21T19:00:00+09:00');
  assertEqual(result, { date: '2026-11-21', weekday: '토' }, 'kstDateParts: KST 토요일 파싱');
}

{
  const result = PartyDateFilter.kstDateParts('2026-11-18T19:00:00+09:00');
  assertEqual(result, { date: '2026-11-18', weekday: '수' }, 'kstDateParts: KST 수요일 파싱');
}

{
  const result = PartyDateFilter.kstDateParts('2026-11-20T16:00:00Z'); // UTC -> KST +9h = 11/21 01:00
  assertEqual(result, { date: '2026-11-21', weekday: '토' }, 'kstDateParts: UTC to KST 경계 변환 (11/20 16:00Z -> 11/21 토)');
}

{
  const result = PartyDateFilter.kstDateParts('invalid-date');
  assertEqual(result, null, 'kstDateParts: 유효하지 않은 날짜는 null');
}

{
  const result = PartyDateFilter.kstDateParts('');
  assertEqual(result, null, 'kstDateParts: 빈 문자열은 null');
}

{
  const result = PartyDateFilter.kstDateParts(null);
  assertEqual(result, null, 'kstDateParts: null은 null');
}

console.log('\n--- filter: mode=all ---');

// all 모드: 전체 얕은 복제 반환
{
  const result = PartyDateFilter.filter(allParties, 'all', { refDate: REF_DATE });
  assertEqual(result.length, allParties.length, 'all: 입력 개수 보존');
  // 얕은 복제 확인 (원본과 다른 객체)
  assertTrue(result[0] !== allParties[0], 'all: 요소는 얕은 복제 (새 객체)');
  assertEqual(result[0].id, allParties[0].id, 'all: 속성은 보존');
}

console.log('\n--- filter: 실제 파티 (startsAt) ---');

// 실제 파티: 2026-11-21 (토) - 이번 주, 주말, 특정 날짜 모두 매치
{
  const result = PartyDateFilter.filter([realPartySat], 'week', { refDate: REF_DATE });
  assertEqual(result.length, 1, '실제 파티(토): week 모드에서 매치');
}

{
  const result = PartyDateFilter.filter([realPartySat], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 1, '실제 파티(토): weekend 모드에서 매치');
}

{
  const result = PartyDateFilter.filter([realPartySat], 'date', { refDate: REF_DATE, date: '2026-11-21' });
  assertEqual(result.length, 1, '실제 파티(토): date 모드(2026-11-21)에서 매치');
}

{
  const result = PartyDateFilter.filter([realPartySat], 'date', { refDate: REF_DATE, date: '2026-11-22' });
  assertEqual(result.length, 0, '실제 파티(토): date 모드(2026-11-22)에서 매치 안 함');
}

// 실제 파티: 2026-11-18 (수) - 이번 주 매치, 주말 매치 안 함
{
  const result = PartyDateFilter.filter([realPartyWed], 'week', { refDate: REF_DATE });
  assertEqual(result.length, 1, '실제 파티(수): week 모드에서 매치');
}

{
  const result = PartyDateFilter.filter([realPartyWed], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 0, '실제 파티(수): weekend 모드에서 매치 안 함');
}

// 실제 파티: 2026-11-25 (다음 주 수) - 이번 주/주말 매치 안 함
{
  const result = PartyDateFilter.filter([realPartyNextWed], 'week', { refDate: REF_DATE });
  assertEqual(result.length, 0, '실제 파티(다음 주 수): week 모드에서 매치 안 함');
}

{
  const result = PartyDateFilter.filter([realPartyNextWed], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 0, '실제 파티(다음 주 수): weekend 모드에서 매치 안 함');
}

// KST 경계 테스트: 2026-11-20T16:00:00Z = KST 11/21 01:00 (토)
{
  const result = PartyDateFilter.filter([realPartyKstBoundary], 'week', { refDate: REF_DATE });
  assertEqual(result.length, 1, 'KST 경계(UTC->KST 토): week 모드에서 매치');
}

{
  const result = PartyDateFilter.filter([realPartyKstBoundary], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 1, 'KST 경계(UTC->KST 토): weekend 모드에서 매치');
}

{
  const result = PartyDateFilter.filter([realPartyKstBoundary], 'date', { refDate: REF_DATE, date: '2026-11-21' });
  assertEqual(result.length, 1, 'KST 경계(UTC->KST 토): date 모드(2026-11-21)에서 매치');
}

console.log('\n--- filter: 예시 파티 (isExample, days[]) ---');

// 예시 파티: days ['금','토'] - weekend 매치
{
  const result = PartyDateFilter.filter([examplePartyFriSat], 'week', { refDate: REF_DATE });
  assertEqual(result.length, 1, '예시 파티(금,토): week 모드에서 매치 (days 비어있지 않음)');
}

{
  const result = PartyDateFilter.filter([examplePartyFriSat], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 1, '예시 파티(금,토): weekend 모드에서 매치 (토 포함)');
}

{
  const result = PartyDateFilter.filter([examplePartyFriSat], 'date', { refDate: REF_DATE, date: '2026-11-21' }); // 토
  assertEqual(result.length, 1, '예시 파티(금,토): date 모드(토)에서 매치');
}

{
  const result = PartyDateFilter.filter([examplePartyFriSat], 'date', { refDate: REF_DATE, date: '2026-11-18' }); // 수
  assertEqual(result.length, 0, '예시 파티(금,토): date 모드(수)에서 매치 안 함');
}

// 예시 파티: days ['월','화'] - weekend 매치 안 함
{
  const result = PartyDateFilter.filter([examplePartyMonTue], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 0, '예시 파티(월,화): weekend 모드에서 매치 안 함');
}

{
  const result = PartyDateFilter.filter([examplePartyMonTue], 'week', { refDate: REF_DATE });
  assertEqual(result.length, 1, '예시 파티(월,화): week 모드에서 매치');
}

// 예시 파티: days ['토'] - date '2026-11-21'(토) 매치
{
  const result = PartyDateFilter.filter([examplePartySatOnly], 'date', { refDate: REF_DATE, date: '2026-11-21' });
  assertEqual(result.length, 1, '예시 파티(토): date 모드(2026-11-21 토)에서 매치');
}

{
  const result = PartyDateFilter.filter([examplePartySatOnly], 'date', { refDate: REF_DATE, date: '2026-11-22' }); // 일
  assertEqual(result.length, 0, '예시 파티(토): date 모드(2026-11-22 일)에서 매치 안 함');
}

{
  const result = PartyDateFilter.filter([examplePartySatOnly], 'weekend', { refDate: REF_DATE });
  assertEqual(result.length, 1, '예시 파티(토): weekend 모드에서 매치');
}

console.log('\n--- filter: 알 수 없는 mode는 all처럼 동작 ---');

{
  const result = PartyDateFilter.filter(allParties, 'unknown', { refDate: REF_DATE });
  assertEqual(result.length, allParties.length, '알 수 없는 mode: all처럼 동작 (전체 반환)');
}

{
  const result = PartyDateFilter.filter(allParties, '', { refDate: REF_DATE });
  assertEqual(result.length, allParties.length, '빈 문자열 mode: all처럼 동작');
}

{
  const result = PartyDateFilter.filter(allParties, null, { refDate: REF_DATE });
  assertEqual(result.length, allParties.length, 'null mode: all처럼 동작');
}

console.log('\n--- filter: 입력 불변성 (Object.freeze) ---');

// 입력 배열/객체 freeze 후 호출해도 예외 없이 동작하고 원본 unchanged
{
  const frozenParties = Object.freeze([
    Object.freeze({ ...realPartySat }),
    Object.freeze({ ...examplePartyFriSat })
  ]);
  
  let threw = false;
  try {
    const result = PartyDateFilter.filter(frozenParties, 'week', { refDate: REF_DATE });
    // 결과 확인: realPartySat(토), examplePartyFriSat(금,토) 둘 다 week에 매치
    assertEqual(result.length, 2, 'freeze 입력: week 필터 정상 동작 (실제+예시 2개 매치)');
    assertTrue(result[0] !== frozenParties[0], 'freeze 입력: 결과는 새 객체');
  } catch (e) {
    threw = true;
    console.log('  ✗ freeze 입력: 예외 발생 - ' + e.message);
    failed++;
    failures.push({ message: 'freeze 입력: 예외 없이 동작해야 함', error: e.message });
  }
  if (!threw) {
    // 원본 불변 확인
    assertEqual(frozenParties.length, 2, 'freeze 입력: 원본 배열 길이 불변');
    assertEqual(frozenParties[0].id, '1', 'freeze 입력: 원본 객체 속성 불변');
    passed++;
    console.log('  ✓ freeze 입력: 원본 불변 유지');
  }
}

{
  // 빈 배열 freeze
  const frozenEmpty = Object.freeze([]);
  const result = PartyDateFilter.filter(frozenEmpty, 'week', { refDate: REF_DATE });
  assertEqual(result.length, 0, 'freeze 빈 배열: 정상 동작');
}

console.log('\n--- filter: 옵션 기본값 ---');

// refDate 기본값: 현재 시간 (고정 테스트를 위해 refDate 명시 권장)
{
  const result = PartyDateFilter.filter([realPartySat], 'week'); // refDate 생략
  // 현재 날짜가 2026-11-16 주가 아닐 수 있으므로 길이는 0 또는 1
  // 그냥 예외 없이 동작하는지만 확인
  assertTrue(Array.isArray(result), 'refDate 생략: 배열 반환');
}

{
  // date 모드에서 date 옵션 없음
  const result = PartyDateFilter.filter([realPartySat], 'date', { refDate: REF_DATE });
  assertEqual(result.length, 0, 'date 모드에서 date 옵션 없음: 매치 안 함');
}

console.log('\n--- filter: 혼합 배열 (실제 + 예시) ---');

{
  const mixed = [
    realPartySat,      // 토 - week, weekend, date(11/21) 매치
    realPartyWed,      // 수 - week만 매치
    realPartyNextWed,  // 다음주 수 - 매치 안 함
    examplePartyFriSat, // 금,토 - week, weekend, date(11/21) 매치
    examplePartyMonTue, // 월,화 - week만 매치
    examplePartySatOnly // 토 - week, weekend, date(11/21) 매치
  ];

  const weekResult = PartyDateFilter.filter(mixed, 'week', { refDate: REF_DATE });
  assertEqual(weekResult.length, 5, '혼합: week 모드 (다음주 수 제외 5개)');

  const weekendResult = PartyDateFilter.filter(mixed, 'weekend', { refDate: REF_DATE });
  assertEqual(weekendResult.length, 3, '혼합: weekend 모드 (토/일 있는 3개: realPartySat, examplePartyFriSat, examplePartySatOnly)');

  const dateResult = PartyDateFilter.filter(mixed, 'date', { refDate: REF_DATE, date: '2026-11-21' });
  assertEqual(dateResult.length, 3, '혼합: date 모드(11/21 토) (3개: realPartySat, examplePartyFriSat, examplePartySatOnly)');
}

console.log('\n--- MODES 상수 ---');
{
  assertEqual(PartyDateFilter.MODES, ['all', 'week', 'weekend', 'date'], 'MODES 상수 확인');
}

// 결과 요약
console.log('\n=== Summary ===');
console.log('Passed:', passed);
console.log('Failed:', failed);

if (failed > 0) {
  console.log('\n=== Failures ===');
  failures.forEach((f, i) => {
    console.log((i + 1) + '. ' + f.message);
    if (f.error) console.log('   Error: ' + f.error);
  });
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}