/**
 * PartyMap - HypeConnect 지도 기반 업체 탐색 (P2 G-09)
 *
 * 계약: window.PartyMap 전역 객체 노출
 * - buildVenues(parties) → { venues: [{ address, venue, parties: [...] }], unknown: [...] }
 *   : 같은 address 파티를 한 업체로 묶는다(입력 순서 유지). address 가 없거나 빈 문자열인
 *     파티는 업체 목록에서 제외해 unknown 으로 분리한다. 입력 배열은 변형하지 않는다.
 * - loadSdk(appkey) → Promise<kakao>
 *   : 카카오맵 JS SDK 를 문서당 한 번만 지연 로드하고 kakao.maps.load 후 전역 kakao 를 resolve.
 *     URL: https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&libraries=services&autoload=false
 *     실패(네트워크/로드 거부) 시 reject. 실패 promise 는 비워 두어 재진입 시 재시도한다.
 * - geocode(address, kakao) → Promise<{ lat, lng, cached } | null>
 *   : services.Geocoder().addressSearch 로 좌표를 구한다. Geocoder 가 실패/빈 결과면 null.
 *     localStorage(CACHE_KEY, 30일 만료) 캐시를 먼저 확인하고, 적중 시 Geocoder 를 부르지 않는다.
 *     같은 주소의 동시 요청은 하나의 promise 를 공유한다.
 * - createMap({ container, kakao, onSelectParty }) → { setParties, destroy }
 *   : 업체 마커와 주소 목록, 시트 패널을 host 컨테이너에 그린다(모두 createElement/textContent).
 *     마커/목록 선택 → 시트, 시트의 '파티 신청하기' → onSelectParty(party) 로 기존 상세 모달 경로를 재사용.
 *     좌표 조회는 동시 GEOCODE_BATCH(3)건 이하로 처리하고, 지도 범위는 마커 전체 setBounds 로 맞춘다.
 *     위경도는 서버로 전송하지 않고 브라우저 localStorage 캐시에만 둔다.
 *
 * IIFE + 'use strict'. DOM/Kakao 의존 함수(loadSdk/geocode/createMap)는 브라우저에서만 동작하며,
 * 순수 로직(buildVenues/좌표 캐시)은 Node 에서도 로드해 검증할 수 있다.
 */

(function () {
  'use strict';

  // 캐시 계약: 주소 1개당 { lat, lng, savedAt(ms epoch)}, 30일 만료
  var CACHE_KEY = 'partyconnect:geocode:v1';
  var CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var GEOCODE_BATCH = 3;                                  // 동시 조회 상한 (설계 §2-3)
  var DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };    // 서울 도심 기본 뷰
  var DEFAULT_ZOOM = 12;
  var inflight = Object.create(null);                     // 주소 → 진행 중 promise (중복 제거)

  // localStorage 접근(프라이빗 모드 등 실패해도 예외를 던지지 않는다)
  function getStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch (e) { /* 접근 불가 → 아래 폴백/null */ }
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* 무시 */ }
    return null;
  }

  // 숫자 좌표만 유효 값으로 인정
  function num(value) {
    return (typeof value === 'number' && isFinite(value)) ? value : null;
  }

  // 캐시 읽기: 만료/형식 불일치/손상 JSON 은 miss(대상 주소 항목만 검증, 다른 항목 보존)
  function readCoordinate(address) {
    var store = getStorage();
    if (!store) return null;
    try {
      var raw = store.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      var entry = parsed[address];
      if (!entry || typeof entry !== 'object') return null;
      var lat = num(entry.lat);
      var lng = num(entry.lng);
      if (lat === null || lng === null) return null;
      if (num(entry.savedAt) === null) return null;
      if (Date.now() - entry.savedAt >= CACHE_TTL_MS) return null;   // 30일 경과 = 만료
      return { lat: lat, lng: lng };
    } catch (e) { return null; }
  }

  // 캐시 쓰기: 저장 실패(용량/프라이빗 모드)는 조용히 무시
  function writeCoordinate(address, lat, lng) {
    var store = getStorage();
    if (!store) return false;
    try {
      var raw = store.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
      parsed[address] = { lat: lat, lng: lng, savedAt: Date.now() };
      store.setItem(CACHE_KEY, JSON.stringify(parsed));
      return true;
    } catch (e) { return false; }
  }

  /**
   * 같은 address 파티를 한 업체로 묶는다.
   * @param {Array} parties
   * @returns {{venues: Array, unknown: Array}} venues 항목: {address, venue, parties}
   *          venue 는 같은 주소의 서로 다른 업체명(중복 제거)을 ' · ' 로 이어 붙인 값
   */
  function buildVenues(parties) {
    var venues = [];
    var unknown = [];
    var index = Object.create(null);
    if (!Array.isArray(parties)) return { venues: venues, unknown: unknown };

    var i, party, addr, group, name;
    for (i = 0; i < parties.length; i++) {
      party = parties[i];
      if (!party || typeof party !== 'object') continue;   // 파티가 아닌 항목(빈 값/숫자 등)은 건너뜀
      addr = party.address;
      if (typeof addr !== 'string' || addr.trim() === '') {
        unknown.push(party);                              // 주소 없음/공백 → unknown 분리
        continue;
      }
      if (index[addr] === undefined) {                     // 주소 문자열 기준 1차 묶음 (0 도 유효한 인덱스)
        index[addr] = venues.length;
        venues.push({ address: addr, venues: [], parties: [] });
      }
      group = venues[index[addr]];
      group.parties.push(party);
      name = party.venue;
      if (typeof name === 'string' && name.trim() !== '' && group.venues.indexOf(name) === -1) {
        group.venues.push(name);
      }
    }

    var out = [];
    for (i = 0; i < venues.length; i++) {
      out.push({ address: venues[i].address, venue: venues[i].venues.join(' · '), parties: venues[i].parties });
    }
    return { venues: out, unknown: unknown };
  }

  // 카카오 주소검색 결과의 좌표 추출(응답 변형별 방어)
  function extractCoord(result) {
    var items = Array.isArray(result) ? result : [result];
    var i, item, cand, lat, lng;
    for (i = 0; i < items.length; i++) {
      item = items[i];
      if (!item || typeof item !== 'object') continue;
      cand = item;
      if (item.latlng && typeof item.latlng === 'object') cand = item.latlng;
      else if (item.point && typeof item.point === 'object') cand = item.point;
      lat = num(cand.lat);
      lng = num(cand.lng);
      if ((lat === null || lng === null) && num(item.y) !== null && num(item.x) !== null) {
        if (lat === null) lat = num(item.y);
        if (lng === null) lng = num(item.x);
      }
      if (lat !== null && lng !== null) return { lat: lat, lng: lng };
    }
    return null;
  }

  /**
   * 주소 → 좌표. 캐시 적중 {lat,lng,cached:true}, Geocoder 실패 시 null,
   * 주소/카카오 없음·Geocoder 예외 등 호출 오류는 reject.
   */
  function geocode(address, kakao) {
    if (typeof address !== 'string' || address.trim() === '') {
      return Promise.reject(new Error('주소가 없어 좌표를 찾을 수 없어요'));
    }
    if (!kakao || !kakao.maps || !kakao.maps.services || typeof kakao.maps.services.Geocoder !== 'function') {
      return Promise.reject(new Error('카카오맵 서비스가 준비되지 않았어요'));
    }
    var hit = readCoordinate(address);
    if (hit) return Promise.resolve({ lat: hit.lat, lng: hit.lng, cached: true });
    if (inflight[address]) return inflight[address];

    var base = new Promise(function (resolve, reject) {
      var geocoder;
      try {
        geocoder = new kakao.maps.services.Geocoder();
      } catch (e) { reject(e); return; }
      var settled = false;
      function finish(fn, value) {
        if (settled) return;
        settled = true;
        delete inflight[address];
        fn(value);
      }
      try {
        geocoder.addressSearch(address, function (result, status) {
          var coord = extractCoord(result);
          if (status === 'FAIL' || coord === null) { finish(resolve, null); return; }
          writeCoordinate(address, coord.lat, coord.lng);
          finish(resolve, { lat: coord.lat, lng: coord.lng, cached: false });
        });
      } catch (e) { finish(reject, e); }
    });
    // 콜백이 동기 호출돼도 중복 예약/읽기 경쟁이 붙지 않도록 then 으로 정리 지점을 미룬다
    var tracked = base.then(
      function (value) { delete inflight[address]; return value; },
      function (err) { delete inflight[address]; throw err; }
    );
    inflight[address] = tracked;
    return tracked;
  }

  // SDK 는 문서당 1회: 성공 promise 는 유지하고, 실패 시 비워 재시도를 허용한다.
  var sdkPromise = null;
  function loadSdk(appkey) {
    if (typeof appkey !== 'string' || appkey.trim() === '') {
      return Promise.reject(new Error('카카오 JavaScript 키가 없어요 (window.PARTYLINK_CONFIG.kakaoJsKey)'));
    }
    if (sdkPromise) return sdkPromise;

    var attempt = new Promise(function (resolve, reject) {
      if (typeof document === 'undefined' || !document.head) {
        reject(new Error('문서가 없어 SDK 를 로드할 수 없어요'));
        return;
      }
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + encodeURIComponent(appkey) +
        '&libraries=services&autoload=false';
      script.onload = function () {
        try {
          var kakao = (typeof window !== 'undefined') ? window.kakao : null;
          if (!kakao || !kakao.maps) {
            reject(new Error('SDK 는 로드됐지만 kakao.maps 를 사용할 수 없어요'));
            return;
          }
          if (typeof kakao.maps.load === 'function') {
            kakao.maps.load(function () { resolve(kakao); });
            return;
          }
          resolve(kakao);   // 방어: maps.load 가 없는 환경
        } catch (e) { reject(e); }
      };
      script.onerror = function () {
        try { if (script.parentNode) script.parentNode.removeChild(script); } catch (e) { /* 무시 */ }
        reject(new Error('카카오맵 SDK 를 불러오지 못했어요 (네트워크 또는 도메인 제한)'));
      };
      try {
        document.head.appendChild(script);
      } catch (e) { reject(e); }
    });

    sdkPromise = attempt;
    attempt.catch(function () { if (sdkPromise === attempt) sdkPromise = null; });
    return attempt;
  }

  // 안전한 DOM 헬퍼(textContent 사용 — innerHTML 금지)
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  // 카카오 마커 클릭 바인딩(환경별 API 차이 방어)
  function bindMarkerClick(marker, handler) {
    if (!marker) return;
    try {
      if (typeof marker.on === 'function') { marker.on('click', handler); return; }
    } catch (e) { /* 아래 시도 계속 */ }
    try {
      if (typeof marker.addEventListener === 'function') { marker.addEventListener('click', handler); return; }
    } catch (e) { /* 아래 시도 계속 */ }
    try { marker.onclick = handler; } catch (e) { /* 클릭 못 쓰면 목록 버튼 사용 가능 */ }
  }

  function labelFor(venue) { return venue.venue ? venue.venue : venue.address; }
  function partyTitle(party) {
    if (party && typeof party === 'object' && typeof party.title === 'string' && party.title !== '') return party.title;
    return '제목 없는 파티';
  }

  function createMap(options) {
    var opts = options || {};
    var container = opts.container;
    var kakao = opts.kakao;
    var onSelectParty = typeof opts.onSelectParty === 'function' ? opts.onSelectParty : function () {};

    if (typeof document === 'undefined' || !document.createElement) throw new Error('문서가 없어 지도를 만들 수 없어요');
    if (!container || typeof container.appendChild !== 'function') throw new Error('지도 컨테이너를 찾지 못했어요');
    if (!kakao || typeof kakao.Map !== 'function' || typeof kakao.maps.LatLng !== 'function' || typeof kakao.maps.LatLngBounds !== 'function') {
      throw new Error('카카오맵 Map 을 사용할 수 없어요');
    }

    var destroyed = false;
    var generation = 0;
    var canvas = el('div', 'party-map-canvas');
    var venueList = el('div', 'party-map-venue-list');
    venueList.setAttribute('role', 'group');
    venueList.setAttribute('aria-label', '업체 목록');
    var issues = el('div', 'party-map-issues');
    var sheet = el('div', 'party-map-sheet');
    sheet.setAttribute('role', 'region');
    sheet.setAttribute('aria-label', '업체 정보');
    sheet.hidden = true;

    var map = null;
    var venues = [];
    var unknown = [];
    var coords = Object.create(null);
    var failed = Object.create(null);
    var markers = [];
    var selected = null;

    function removeNode(node) {
      if (node && node.parentNode) {
        try { node.parentNode.removeChild(node); } catch (e) { /* 무시 */ }
      }
    }
    function clearNodes() { removeNode(canvas); removeNode(venueList); removeNode(issues); removeNode(sheet); }

    container.appendChild(canvas);
    container.appendChild(venueList);
    container.appendChild(issues);
    container.appendChild(sheet);

    try {
      map = new kakao.Map(canvas, {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        zoom: DEFAULT_ZOOM
      });
    } catch (e) {
      clearNodes();
      throw new Error('지도를 그리지 못했어요: ' + ((e && e.message) ? e.message : '알 수 없는 오류'));
    }

    function selectVenue(venue) {
      if (destroyed || !venue) return;
      selected = venue;
      sheet.textContent = '';                       // 서브트리 안전 정리
      sheet.appendChild(el('p', 'party-map-sheet-title', labelFor(venue)));
      sheet.appendChild(el('p', 'party-map-sheet-sub', venue.address));
      var parties = Array.isArray(venue.parties) ? venue.parties : [];
      sheet.appendChild(el('p', 'party-map-sheet-sub', '파티 ' + parties.length + '개'));
      parties.forEach(function (party) {
        var row = el('div', 'party-map-sheet-row');
        if (party && typeof party === 'object') {
          row.appendChild(el('span', 'party-map-sheet-party', partyTitle(party)));
        }
        var btn = el('button', 'party-map-sheet-btn', '파티 신청하기');
        btn.setAttribute('type', 'button');
        btn.onclick = function () { onSelectParty(party); };
        row.appendChild(btn);
        sheet.appendChild(row);
      });
      sheet.hidden = false;
    }

    function clearMarkers() {
      for (var i = 0; i < markers.length; i++) {
        var node = markers[i];
        markers[i] = null;
        if (node && typeof node.setMap === 'function') {
          try { node.setMap(null); } catch (e) { /* 무시 */ }
        }
      }
      markers = [];
      venueList.textContent = '';
    }

    function drawMarker(venue) {
      if (destroyed) return;
      var coord = coords[venue.address];
      if (!coord) return;
      try {
        var marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(coord.lat, coord.lng),
          map: map,
          title: labelFor(venue)
        });
        bindMarkerClick(marker, function () { selectVenue(venue); });
        markers.push(marker);

        var btn = el('button', 'party-map-venue-btn', labelFor(venue) + ' · 파티 ' +
          ((Array.isArray(venue.parties) ? venue.parties.length : 0)) + '개');
        btn.setAttribute('type', 'button');
        btn.onclick = function () { selectVenue(venue); };
        venueList.appendChild(btn);
      } catch (e) {
        failed[venue.address] = true;          // 마커 생성 실패 → 위치를 찾지 못한 업체로 표시
      }
    }

    function renderIssues() {
      if (destroyed) return;
      issues.textContent = '';
      if (venues.length === 0 && unknown.length === 0) {
        issues.appendChild(el('p', 'party-map-issue', '표시할 업체가 없어요'));
        return;
      }
      if (unknown.length > 0) {
        issues.appendChild(el('p', 'party-map-issue-head', '주소가 없어 지도에 표시하지 못한 파티 ' + unknown.length + '건'));
        unknown.forEach(function (party) { issues.appendChild(el('p', 'party-map-issue', partyTitle(party))); });
      }
      var failedVenues = venues.filter(function (v) { return !!failed[v.address]; });
      if (failedVenues.length > 0) {
        issues.appendChild(el('p', 'party-map-issue-head', '위치를 찾지 못한 업체'));
        failedVenues.forEach(function (v) {
          issues.appendChild(el('p', 'party-map-issue-strong', labelFor(v)));
          issues.appendChild(el('p', 'party-map-issue', v.address));
        });
      }
    }

    function fitBounds() {
      if (destroyed || !map) return;
      var pts = [];
      venues.forEach(function (v) {
        var coord = coords[v.address];
        if (coord) pts.push(new kakao.maps.LatLng(coord.lat, coord.lng));
      });
      if (pts.length === 0) return;
      try {
        var bounds = new kakao.maps.LatLngBounds();
        for (var i = 0; i < pts.length; i++) bounds.extend(pts[i]);
        map.setBounds(bounds);
      } catch (e) { /* 범위 맞춤 실패는 치명적이지 않음 */ }
    }

    function refreshMarkers() {
      if (destroyed) return;
      var gen = ++generation;
      clearMarkers();
      failed = Object.create(null);
      var waiting = [];
      venues.forEach(function (v) {
        if (coords[v.address]) drawMarker(v);
        else waiting.push(v.address);
      });

      function finish() {
        if (destroyed || gen !== generation) return;
        fitBounds();
        renderIssues();
      }
      if (waiting.length === 0) { finish(); return; }

      for (var start = 0; start < waiting.length; start += GEOCODE_BATCH) {
        var chunk = waiting.slice(start, start + GEOCODE_BATCH);
        Promise.all(chunk.map(function (address) {
          return geocode(address, kakao).then(
            function (coord) { return { address: address, coord: coord }; },
            function (e) { return { address: address, coord: null }; }
          );
        })).then(function (results) {
          if (destroyed || gen !== generation) return;
          results.forEach(function (r) {
            if (r.coord) {
              coords[r.address] = { lat: r.coord.lat, lng: r.coord.lng };
              venues.forEach(function (v) { if (v.address === r.address) drawMarker(v); });
            } else {
              failed[r.address] = true;
            }
          });
          if (start + GEOCODE_BATCH >= waiting.length) finish();
          else renderIssues();
        });
      }
    }

    function setParties(parties) {
      if (destroyed) return;
      var grouped = buildVenues(parties);
      venues = grouped.venues;
      unknown = grouped.unknown;
      if (selected) {
        var keep = false;
        for (var i = 0; i < venues.length; i++) { if (venues[i].address === selected.address) { keep = true; break; } }
        if (!keep) { selected = null; sheet.hidden = true; }
      }
      refreshMarkers();
    }

    function destroy() {
      destroyed = true;
      clearMarkers();
      clearNodes();
      venues = [];
      unknown = [];
      coords = Object.create(null);
      failed = Object.create(null);
      markers = [];
      selected = null;
    }

    return { setParties: setParties, destroy: destroy };
  }

  if (typeof window !== 'undefined') {
    window.PartyMap = {
      buildVenues: buildVenues,
      loadSdk: loadSdk,
      geocode: geocode,
      createMap: createMap,
      CACHE_KEY: CACHE_KEY,
      CACHE_TTL_MS: CACHE_TTL_MS
    };
  }
})();
