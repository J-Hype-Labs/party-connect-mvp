/**
 * PartyShare 단위 테스트
 * Node.js에서 실행: node tests/unit/party-share.test.js
 * 의존성: 내장 모듈만 사용 (assert, fs, vm)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 테스트 결과 추적
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
    assert.deepStrictEqual(actual, expected);
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
    console.error(`     Expected: true`);
    console.error(`     Actual:   ${JSON.stringify(value)}`);
    failed++;
    failures.push({ message, expected: true, actual: value, error: e.message });
  }
}

function assertFalse(value, message) {
  try {
    assert.strictEqual(value, false);
    console.log(`  ✅ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${message}`);
    console.error(`     Expected: false`);
    console.error(`     Actual:   ${JSON.stringify(value)}`);
    failed++;
    failures.push({ message, expected: false, actual: value, error: e.message });
  }
}

// window 스텁 생성
const windowStub = {
  isSecureContext: true,
  navigator: {
    clipboard: {
      writeText: async function(text) {
        // 성공 시뮬레이션 - 실제 테스트에서는 호출하지 않음
        return Promise.resolve();
      }
    }
  },
  document: {
    body: {
      appendChild: function() {},
      removeChild: function() {}
    },
    createElement: function() {
      return {
        style: {},
        value: '',
        select: function() {},
        setSelectionRange: function() {},
        setAttribute: function() {},
        parentNode: null
      };
    },
    execCommand: function() {
      return true;
    }
  }
};

// party-share.js 로드 및 실행
const shareJsPath = path.join(__dirname, '..', '..', 'js', 'party-share.js');
const shareJsCode = fs.readFileSync(shareJsPath, 'utf-8');

// vm 컨텍스트에 window 주입하여 실행
const context = vm.createContext({ window: windowStub, navigator: windowStub.navigator, document: windowStub.document, isSecureContext: true, URLSearchParams: URLSearchParams, decodeURIComponent: decodeURIComponent, encodeURIComponent: encodeURIComponent });
vm.runInContext(shareJsCode, context);

const PartyShare = context.window.PartyShare;

if (!PartyShare) {
  console.error('❌ PartyShare가 window에 노출되지 않았습니다.');
  process.exit(1);
}

console.log('\n========== PartyShare 단위 테스트 ==========\n');

// 1. getPartyIdFromSearch 테스트
console.log('--- getPartyIdFromSearch ---');

assertEqual(
  PartyShare.getPartyIdFromSearch('?party=abc%201'),
  'abc 1',
  'URL 인코딩된 공백 디코딩'
);

assertEqual(
  PartyShare.getPartyIdFromSearch('?party='),
  null,
  '빈 party 파라미터 → null'
);

assertEqual(
  PartyShare.getPartyIdFromSearch(''),
  null,
  '빈 문자열 → null'
);

assertEqual(
  PartyShare.getPartyIdFromSearch('?other=1'),
  null,
  'party 파라미터 없음 → null'
);

assertEqual(
  PartyShare.getPartyIdFromSearch('?party=123'),
  '123',
  '일반적인 숫자 id'
);

assertEqual(
  PartyShare.getPartyIdFromSearch('?party=hello%20world%21'),
  'hello world!',
  '특수문자 인코딩 디코딩'
);

assertEqual(
  PartyShare.getPartyIdFromSearch('?party=  test  '),
  'test',
  '앞뒤 공백 trim'
);

assertEqual(
  PartyShare.getPartyIdFromSearch('?party=ko%EA%B0%80%EB%82%98'),
  'ko가나',
  '한글 UTF-8 인코딩 디코딩 (NFC 형태)'
);

// 2. buildShareUrl 테스트
console.log('\n--- buildShareUrl ---');

assertEqual(
  PartyShare.buildShareUrl({ id: '42' }, 'https://x.io', '/p/'),
  'https://x.io/p/?party=42',
  '기본 케이스 (pathname 끝에 슬래시 있음)'
);

assertEqual(
  PartyShare.buildShareUrl({ id: '42' }, 'https://x.io', '/p'),
  'https://x.io/p/?party=42',
  'pathname 끝 슬래시 없음 → 동일 결과'
);

assertEqual(
  PartyShare.buildShareUrl({ id: '42' }, 'https://x.io/', '/p/'),
  'https://x.io/p/?party=42',
  'origin 끝 슬래시 있음 → 중복 슬래시 없음'
);

assertEqual(
  PartyShare.buildShareUrl({ id: '42' }, 'https://x.io', 'p/'),
  'https://x.io/p/?party=42',
  'pathname 앞 슬래시 없음 → 자동 추가'
);

assertEqual(
  PartyShare.buildShareUrl({ id: 'hello world' }, 'https://x.io', '/p/'),
  'https://x.io/p/?party=hello%20world',
  '공백 포함 id → 인코딩됨'
);

assertEqual(
  PartyShare.buildShareUrl({ id: '한글' }, 'https://x.io', '/p/'),
  'https://x.io/p/?party=%ED%95%9C%EA%B8%80',
  '한글 id → UTF-8 인코딩됨'
);

assertEqual(
  PartyShare.buildShareUrl({ id: 'test%20id' }, 'https://x.io', '/p/'),
  'https://x.io/p/?party=test%2520id',
  '이미 인코딩된 값도 다시 인코딩 (이중 인코딩 방지는 호출자 책임)'
);

// 3. isShareable 테스트
console.log('\n--- isShareable ---');

assertTrue(
  PartyShare.isShareable({ id: '1', isExample: false }),
  '실제 파티 (isExample:false) → true'
);

assertTrue(
  PartyShare.isShareable({ id: '1' }),
  'isExample 속성 없는 파티 → true'
);

assertFalse(
  PartyShare.isShareable({ id: 'example-1', isExample: true }),
  '예시 파티 (isExample:true) → false'
);

assertFalse(
  PartyShare.isShareable(null),
  'null → false'
);

assertFalse(
  PartyShare.isShareable(undefined),
  'undefined → false'
);

assertTrue(
  PartyShare.isShareable({}),
  '빈 객체 (truthy, isExample 없음) → true'
);

// 4. copyText는 브라우저 전용이므로 단위테스트에서 호출하지 않음 (계약 준수)
// 대신 함수 존재 여부만 확인
console.log('\n--- copyText 존재 확인 ---');
assertTrue(
  typeof PartyShare.copyText === 'function',
  'copyText 함수가 존재한다'
);

// 결과 요약
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