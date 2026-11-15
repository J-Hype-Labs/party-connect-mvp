/**
 * PartyQR 단위 테스트
 * 실행: node tests/unit/party-qr.test.js
 * 의존성: assert, fs, vm (Node 내장만 사용)
 */

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// party-qr.js 로드
const code = fs.readFileSync('js/party-qr.js', 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const PartyQR = sandbox.window.PartyQR;

assert.ok(PartyQR, 'PartyQR 네임스페이스가 window에 노출되어야 함');
assert.ok(typeof PartyQR.toMatrix === 'function', 'toMatrix 함수가 있어야 함');
assert.ok(typeof PartyQR.toSVG === 'function', 'toSVG 함수가 있어야 함');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✅ ' + name);
    passed++;
  } catch (e) {
    console.error('  ❌ ' + name);
    console.error('     ' + e.message);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg + '\n     Expected: ' + JSON.stringify(expected) + '\n     Actual: ' + JSON.stringify(actual));
  }
}

function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(msg + '\n     Expected: ' + b + '\n     Actual: ' + a);
  }
}

function assertMatrixEqual(m1, m2, msg) {
  if (m1.length !== m2.length) throw new Error(msg + ' - different row count');
  for (let r = 0; r < m1.length; r++) {
    if (m1[r].length !== m2[r].length) throw new Error(msg + ' - different col count at row ' + r);
    for (let c = 0; c < m1[r].length; c++) {
      if (m1[r][c] !== m2[r][c]) throw new Error(msg + ' - mismatch at [' + r + '][' + c + ']');
    }
  }
}

// ===== toMatrix 테스트 =====

test('toMatrix("HC-7F3K9Q") returns square matrix', () => {
  const matrix = PartyQR.toMatrix('HC-7F3K9Q');
  assert.ok(Array.isArray(matrix), 'matrix should be array');
  assert.ok(matrix.length > 0, 'matrix should not be empty');
  const n = matrix.length;
  for (let row of matrix) {
    assert.ok(Array.isArray(row), 'each row should be array');
    assertEqual(row.length, n, 'matrix should be square');
  }
  assert.ok((n - 17) % 4 === 0, 'size should be 17 + 4*version');
  const version = (n - 17) / 4;
  assert.ok(Number.isInteger(version) && version >= 1, 'version should be integer >= 1');
});

test('toMatrix("123456") returns square matrix', () => {
  const matrix = PartyQR.toMatrix('123456');
  assert.ok(Array.isArray(matrix));
  const n = matrix.length;
  assert.ok((n - 17) % 4 === 0);
  const version = (n - 17) / 4;
  assert.ok(Number.isInteger(version) && version >= 1);
});

test('toMatrix empty string returns empty array', () => {
  const matrix = PartyQR.toMatrix('');
  assertDeepEqual(matrix, [], 'empty string should return []');
});

test('toMatrix null returns empty array', () => {
  const matrix = PartyQR.toMatrix(null);
  assertDeepEqual(matrix, [], 'null should return []');
});

test('toMatrix undefined returns empty array', () => {
  const matrix = PartyQR.toMatrix(undefined);
  assertDeepEqual(matrix, [], 'undefined should return []');
});

// 파인더 패턴 검증 (좌상, 우상, 좌하 7x7 영역)
test('finder pattern top-left 7x7', () => {
  const matrix = PartyQR.toMatrix('HC-7F3K9Q');
  const n = matrix.length;
  // 바깥 7x7 테두리는 모두 true (어두움)
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (r === 0 || r === 6 || c === 0 || c === 6) {
        assert.ok(matrix[r][c] === true, `finder top-left border [${r}][${c}] should be dark`);
      }
    }
  }
  // 내부 5x5 (1~5) 중 중심 3x3(2~4) 제외한 영역은 false (밝음)
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) {
      if (!(r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
        assert.ok(matrix[r][c] === false, `finder top-left inner [${r}][${c}] should be light`);
      }
    }
  }
  // 중심 3x3 (2~4)은 모두 true (어두움)
  for (let r = 2; r <= 4; r++) {
    for (let c = 2; c <= 4; c++) {
      assert.ok(matrix[r][c] === true, `finder top-left center [${r}][${c}] should be dark`);
    }
  }
});

test('finder pattern top-right 7x7', () => {
  const matrix = PartyQR.toMatrix('HC-7F3K9Q');
  const n = matrix.length;
  for (let r = 0; r < 7; r++) {
    for (let c = n - 7; c < n; c++) {
      if (r === 0 || r === 6 || c === n - 7 || c === n - 1) {
        assert.ok(matrix[r][c] === true, `finder top-right border [${r}][${c}] should be dark`);
      }
    }
  }
  for (let r = 1; r <= 5; r++) {
    for (let c = n - 6; c <= n - 2; c++) {
      if (!(r >= 2 && r <= 4 && c >= n - 5 && c <= n - 3)) {
        assert.ok(matrix[r][c] === false, `finder top-right inner [${r}][${c}] should be light`);
      }
    }
  }
  for (let r = 2; r <= 4; r++) {
    for (let c = n - 5; c <= n - 3; c++) {
      assert.ok(matrix[r][c] === true, `finder top-right center [${r}][${c}] should be dark`);
    }
  }
});

test('finder pattern bottom-left 7x7', () => {
  const matrix = PartyQR.toMatrix('HC-7F3K9Q');
  const n = matrix.length;
  for (let r = n - 7; r < n; r++) {
    for (let c = 0; c < 7; c++) {
      if (r === n - 7 || r === n - 1 || c === 0 || c === 6) {
        assert.ok(matrix[r][c] === true, `finder bottom-left border [${r}][${c}] should be dark`);
      }
    }
  }
  for (let r = n - 6; r <= n - 2; r++) {
    for (let c = 1; c <= 5; c++) {
      if (!(r >= n - 5 && r <= n - 3 && c >= 2 && c <= 4)) {
        assert.ok(matrix[r][c] === false, `finder bottom-left inner [${r}][${c}] should be light`);
      }
    }
  }
  for (let r = n - 5; r <= n - 3; r++) {
    for (let c = 2; c <= 4; c++) {
      assert.ok(matrix[r][c] === true, `finder bottom-left center [${r}][${c}] should be dark`);
    }
  }
});

// 타이밍 패턴: 6행, 6열이 교대 (dark/light)
test('timing pattern row 6 alternates', () => {
  const matrix = PartyQR.toMatrix('HC-7F3K9Q');
  const n = matrix.length;
  for (let c = 8; c < n - 8; c++) {
    const expected = (c % 2 === 0);
    assert.ok(matrix[6][c] === expected, `timing row 6 col ${c} should be ${expected}`);
  }
});

test('timing pattern col 6 alternates', () => {
  const matrix = PartyQR.toMatrix('HC-7F3K9Q');
  const n = matrix.length;
  for (let r = 8; r < n - 8; r++) {
    const expected = (r % 2 === 0);
    assert.ok(matrix[r][6] === expected, `timing col 6 row ${r} should be ${expected}`);
  }
});

// 결정성: 같은 입력 -> 같은 행렬
test('deterministic: same text produces same matrix', () => {
  const m1 = PartyQR.toMatrix('HC-7F3K9Q');
  const m2 = PartyQR.toMatrix('HC-7F3K9Q');
  assertMatrixEqual(m1, m2, 'same input should produce identical matrix');
});

// 다른 입력 -> 다른 행렬
test('different text produces different matrix', () => {
  const m1 = PartyQR.toMatrix('HC-7F3K9Q');
  const m2 = PartyQR.toMatrix('DIFFERENT');
  let same = true;
  if (m1.length === m2.length) {
    for (let r = 0; r < m1.length; r++) {
      for (let c = 0; c < m1.length; c++) {
        if (m1[r][c] !== m2[r][c]) { same = false; break; }
      }
      if (!same) break;
    }
  } else {
    same = false;
  }
  assert.ok(!same, 'different input should produce different matrix');
});

// ===== toSVG 테스트 =====

test('toSVG("123456", {size:200}) contains svg tags', () => {
  const svg = PartyQR.toSVG('123456', { size: 200 });
  assert.ok(typeof svg === 'string', 'should return string');
  assert.ok(svg.includes('<svg'), 'should contain <svg');
  assert.ok(svg.includes('</svg>'), 'should contain </svg>');
  assert.ok(svg.includes('viewBox'), 'should contain viewBox');
  assert.ok(svg.includes('width="200"'), 'should contain width="200"');
  assert.ok(svg.includes('height="200"'), 'should contain height="200"');
  const hasRect = svg.includes('<rect');
  const hasPath = svg.includes('<path');
  assert.ok(hasRect || hasPath, 'should contain rect or path elements');
});

test('toSVG("HC-7F3K9Q") default options', () => {
  const svg = PartyQR.toSVG('HC-7F3K9Q');
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('viewBox'));
  assert.ok(svg.includes('width="160"'));
  assert.ok(svg.includes('height="160"'));
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(svg.includes('#047857'), 'should use emerald-700 dark color');
  assert.ok(svg.includes('#ffffff'), 'should use white light color');
});

test('toSVG empty string returns empty string', () => {
  const svg = PartyQR.toSVG('');
  assertEqual(svg, '', 'empty string should return empty SVG string');
});

test('toSVG null returns empty string', () => {
  const svg = PartyQR.toSVG(null);
  assertEqual(svg, '', 'null should return empty SVG string');
});

test('toSVG custom options', () => {
  const svg = PartyQR.toSVG('TEST', { size: 300, margin: 8, dark: '#ff0000', light: '#00ff00' });
  assert.ok(svg.includes('width="300"'));
  assert.ok(svg.includes('height="300"'));
  assert.ok(svg.includes('#ff0000'));
  assert.ok(svg.includes('#00ff00'));
});

// ===== 요약 =====
console.log('\n========== TEST SUMMARY ==========');
console.log('Passed: ' + passed);
console.log('Failed: ' + failed);
if (failed > 0) {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
  process.exit(0);
}