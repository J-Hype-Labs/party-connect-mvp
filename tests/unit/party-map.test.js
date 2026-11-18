/**
 * PartyMap 단위 테스트
 * 실행: node tests/unit/party-map.test.js
 * 의존성: 내장 모듈만 (assert, fs, path, vm)
 *
 * - buildVenues: 주소 묶기 · 빈 주소/비객체 unknown 분리 · 입력 변형 없음
 * - geocode: localStorage 좌표 캐시 (적중 0회 / 만료 재조회 / 실패 null / 동시 요청 공유)
 * - loadSdk: 키 검증 · URL 1회 로드 · 실패 시 재시도 가능 (document/window 는 스텁)
 *
 * VM 샌드박스에서 로드하므로 DOM/전역 의존 함수는 스텁으로 감싼다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const assert = require('assert');

let passed = 0;
let failed = 0;
const failures = [];

function ok(cond, message) {
  try {
    assert.ok(cond);
    console.log(`  ✅ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${message}`);
    failed++;
    failures.push({ message, error: e.message });
  }
}

function eq(actual, expected, message) {
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

function deep(a, b, message) {
  try {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
    console.log(`  ✅ ${message}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${message}`);
    console.error(`     Expected: ${JSON.stringify(b)}`);
    console.error(`     Actual:   ${JSON.stringify(a)}`);
    failed++;
    failures.push({ message, expected: b, actual: a, error: e.message });
  }
}

// VM 샌드박스 적재: window/localStorage/document 를 스텁으로 제공한다.
function loadModule(opts) {
  const o = opts || {};
  // 테스트가 같은 store 를 읽어 캐시 쓰기를 검사할 수 있도록 참조를 유지한다(복사 금지).
  const store = o.store || {};
  const appended = [];
  const win = { __partyMapEnsureMap: o.ensureMap || null };
  if (o.kakao) win.kakao = o.kakao;
  const sandbox = {
    window: win,
    console: console,
    setTimeout: o.setTimeout || setTimeout,
    clearTimeout: o.clearTimeout || clearTimeout
  };
  if (o.document !== false) {
    sandbox.document = {
      createElement: () => ({ tagName: 'script', src: '', async: false, parentNode: null, onload: null, onerror: null }),
      head: { appendChild: (el) => { appended.push(el); } }
    };
  }
  sandbox.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(__dirname, '../../js/party-map.js'), 'utf8');
  vm.runInContext(code, sandbox);
  return { PartyMap: sandbox.window.PartyMap, store, win, appended };
}

function geocoderFor(map) {
  function Geocoder() { Geocoder.calls = (Geocoder.calls || 0) + 1; }
  Geocoder.prototype.addressSearch = function (address, cb) {
    const spec = map[address];
    if (spec === 'FAIL') { cb(null, 'FAIL'); return; }
    if (spec) { cb(spec, 'OK'); return; }
    cb(null, 'FAIL');
  };
  return Geocoder;
}

async function main() {
  console.log('\n--- buildVenues: 같은 주소 묶기 ---');
  {
    const { PartyMap } = loadModule();
    const p1 = { id: 'p1', title: 'A', venue: '라운지 A', address: '서울 강남' };
    const p2 = { id: 'p2', title: 'B', venue: '라운지 B', address: '서울 강남' };
    const p3 = { id: 'p3', title: 'C', venue: '바 C', address: '서울 서초' };
    const input = [p1, p2, p3];
    const snapshot = JSON.stringify(input);
    const grouped = PartyMap.buildVenues(input);
    eq(grouped.venues.length, 2, '주소 2건 → 업체 2개');
    eq(grouped.unknown.length, 0, 'unknown 없음');
    eq(grouped.venues[0].address, '서울 강남', '첫 업체 주소');
    eq(grouped.venues[0].parties.length, 2, '같은 주소 파티 2건 묶음');
    eq(grouped.venues[0].parties[0].id, 'p1', '묶인 파티 순서 보존');
    eq(grouped.venues[0].venue, '라운지 A · 라운지 B', '서로 다른 업체명 이어붙임');
    eq(grouped.venues[1].parties[0].id, 'p3', '다른 주소는 별도 업체');
    eq(JSON.stringify(input), snapshot, '입력 배열 변형 없음');
  }

  console.log('\n--- buildVenues: 빈 주소는 unknown 분리 ---');
  {
    const { PartyMap } = loadModule();
    const grouped = PartyMap.buildVenues([
      { id: 'a', address: '서울 강남', venue: 'V' },
      { id: 'b', venue: 'V2' },
      { id: 'c', address: '   ', venue: 'V3' },
      null, 42, { id: 'd', address: 9 }
    ]);
    eq(grouped.venues.length, 1, '주소 있는 파티만 업체로 묶임');
    eq(grouped.venues[0].parties[0].id, 'a', '유효 주소 파티 포함');
    eq(grouped.unknown.length, 3, '주소 없음/공백/비문자열 → unknown (파티 아닌 항목은 건너뜀)');
    deep(
      grouped.unknown.map((p) => (p && p.id) || String(p)),
      ['b', 'c', 'd'],
      'unknown 원본 유지'
    );
  }

  console.log('\n--- buildVenues: 입력 방어 ---');
  {
    const { PartyMap } = loadModule();
    deep(PartyMap.buildVenues(null), { venues: [], unknown: [] }, 'null → 빈 결과');
    deep(PartyMap.buildVenues(undefined), { venues: [], unknown: [] }, 'undefined → 빈 결과');
    deep(PartyMap.buildVenues('not-array'), { venues: [], unknown: [] }, '배열 아님 → 빈 결과');
    deep(PartyMap.buildVenues([]), { venues: [], unknown: [] }, '빈 배열 → 빈 결과');
  }

  console.log('\n--- geocode: 캐시 적중 시 Geocoder 0회 ---');
  {
    const addr = '서울 강남';
    const store = {};
    store[PartyMapCacheKey()] = JSON.stringify({ [addr]: { lat: 37.3, lng: 126.5, savedAt: Date.now() } });
    let calls = 0;
    function SpyGeocoder() { calls += 1; }
    SpyGeocoder.prototype.addressSearch = function () {};
    const { PartyMap } = loadModule({ store });
    const r = await PartyMap.geocode(addr, { maps: { services: { Geocoder: SpyGeocoder } } });
    eq(calls, 0, 'Geocoder 생성 0회');
    eq(r && r.cached, true, '캐시 적중');
    eq(r.lat, 37.3, '캐시 좌표 반환');
  }

  console.log('\n--- geocode: 만료 캐시는 재조회하고 저장한다 ---');
  {
    const addr = '서울 서초';
    const store = {};
    store[PartyMapCacheKey()] = JSON.stringify({ [addr]: { lat: 1, lng: 2, savedAt: Date.now() - PartyMapTtl() - 1000 } });
    const geocoder = geocoderFor({ [addr]: [{ latlng: { lat: 37.1, lng: 127.1 } }] });
    const { PartyMap, store: live } = loadModule({ store });
    const r = await PartyMap.geocode(addr, { maps: { services: { Geocoder: geocoder } } });
    eq(r.cached, false, '만료 → 재조회');
    eq(r.lat, 37.1, '새 좌표 반환');
    eq(geocoder.calls, 1, 'Geocoder 1회 호출');
    const saved = JSON.parse(live[PartyMapCacheKey()]);
    eq(saved[addr].lat, 37.1, '조회 성공 좌표 캐시 저장');
    eq(Date.now() - saved[addr].savedAt < PartyMapTtl(), true, 'savedAt 신선한 값');
  }

  console.log('\n--- geocode: 주소 실패는 null (캐시 미기록) ---');
  {
    const addr = '서울 용산';
    const store = {};
    const { PartyMap } = loadModule({ store });
    const geocoder = geocoderFor({ [addr]: 'FAIL' });
    const r = await PartyMap.geocode(addr, { maps: { services: { Geocoder: geocoder } } });
    eq(r, null, '실패 주소 → null');
    eq(geocoder.calls, 1, '실패 1회 호출');
    eq(store[PartyMapCacheKey()], undefined, '실패 주소 캐시 미기록');
  }

  console.log('\n--- geocode: 동시 요청은 공유 ---');
  {
    const addr = '서울 마포';
    const pending = {};
    let constructed = 0;
    function Geocoder() { constructed += 1; }
    Geocoder.prototype.addressSearch = function (address, cb) { pending[address] = cb; };
    const { PartyMap } = loadModule();
    const p1 = PartyMap.geocode(addr, { maps: { services: { Geocoder: Geocoder } } });
    const p2 = PartyMap.geocode(addr, { maps: { services: { Geocoder: Geocoder } } });
    eq(p1, p2, '동시 요청은 같은 promise 공유');
    eq(constructed, 1, 'Geocoder 인스턴스 1개');
    pending[addr]([{ latlng: { lat: 36.1, lng: 126.1 } }], 'OK');
    const [a, b] = await Promise.all([p1, p2]);
    eq(a.lat, 36.1, '첫 결과 좌표');
    eq(b.lat, 36.1, '공유 결과 동일 좌표');
  }

  console.log('\n--- loadSdk: 키 없음/URL/1회 로드 ---');
  {
    const { PartyMap } = loadModule({ document: false });
    let rejected = null;
    try { await PartyMap.loadSdk(''); } catch (e) { rejected = e; }
    eq(rejected && /키/.test(rejected.message), true, '빈 키 거부');
    let rejected2 = null;
    try { await PartyMap.loadSdk(undefined); } catch (e) { rejected2 = e; }
    eq(!!rejected2, true, 'undefined 키 거부');
  }
  {
    let loadCalls = 0;
    const stubKakao = { maps: { load: (cb) => { loadCalls++; cb(); } } };
    const { PartyMap, appended, win } = loadModule({ kakao: stubKakao });
    const key = 'test-key';
    const p1 = PartyMap.loadSdk(key);
    const p2 = PartyMap.loadSdk(key);
    eq(p1, p2, '같은 세션 로드 promise 재사용');
    eq(appended.length, 1, 'SDK 스크립트 1회 생성');
    eq(appended[0].src, 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=test-key&libraries=services&autoload=false', 'SDK URL 조립');
    appended[0].onload();
    const kakao = await p1;
    eq(kakao, win.kakao, 'kakao 전역 resolve');
    eq(loadCalls, 1, 'kakao.maps.load 호출');
  }

  console.log('\n--- loadSdk: 실패 시 reject · 재시도 가능 ---');
  {
    const { PartyMap, appended } = loadModule();
    const p = PartyMap.loadSdk('test-key');
    appended[0].onerror();
    let err = null;
    try { await p; } catch (e) { err = e; }
    eq(err && /SDK/.test(err.message), true, '로드 실패 reject');
    const again = PartyMap.loadSdk('test-key');
    eq(appended.length, 2, '실패 후 재시도 시 다시 로드 시도');
    appended[1].onerror();
    err = null;
    try { await again; } catch (e) { err = e; }
    eq(!!err, true, '재시도 실패도 reject');
  }

  console.log('\n========== 테스트 결과 요약 ==========');
  console.log(`통과: ${passed}`);
  console.log(`실패: ${failed}`);
  console.log(`총계: ${passed + failed}`);
  if (failed > 0) {
    console.log('\n--- 실패 상세 ---');
    failures.forEach((f, i) => console.log(`${i + 1}. ${f.message}`));
    console.log('\n❌ 일부 테스트 실패');
    process.exitCode = 1;
  } else {
    console.log('\n✅ 모든 테스트 통과');
  }
}

function PartyMapCacheKey() { return 'partyconnect:geocode:v1'; }
function PartyMapTtl() { return 30 * 24 * 60 * 60 * 1000; }

main().catch((e) => { console.error(e); process.exit(1); });
