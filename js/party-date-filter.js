/**
 * PartyDateFilter - 파티 날짜 필터링 유틸리티
 *
 * 계약: window.PartyDateFilter 제공
 * - MODES: ['all','week','weekend','date']
 * - kstDateParts(iso): {date:'YYYY-MM-DD', weekday:'월'..'일'} 반환, 유효하지 않으면 null
 * - filter(parties, mode, options): 새 배열 반환 (입력 변형 금지, 요소는 얕은 복제)
 *   options={refDate: ISO(기본 new Date().toISOString()), date:'YYYY-MM-DD'('date' 모드용)}
 * 모든 날짜 계산은 KST(Asia/Seoul) 기준.
 */

(function () {
  'use strict';

  // 지원하는 필터 모드
  var MODES = ['all', 'week', 'weekend', 'date'];

  // 요일 매핑 (Intl.DateTimeFormat 'short' 형식: 월, 화, 수, 목, 금, 토, 일)
  var WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

  /**
   * 객체 얕은 복제 (모든 자체 속성 보존)
   * @param {Object} obj
   * @returns {Object}
   */
  function shallowClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    var cloned = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = obj[key];
      }
    }
    return cloned;
  }

  /**
   * ISO 문자열을 KST 기준 날짜 파츠로 변환
   * @param {string} iso - ISO 8601 날짜 문자열
   * @returns {{date: string, weekday: string} | null} {date: 'YYYY-MM-DD', weekday: '월'..'일'} 또는 null
   */
  function kstDateParts(iso) {
    if (typeof iso !== 'string' || iso.length === 0) return null;
    var d = new Date(iso);
    if (isNaN(d)) return null;

    try {
      // Intl.DateTimeFormat으로 KST 변환
      var formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      });
      var parts = formatter.formatToParts(d);
      var year = '';
      var month = '';
      var day = '';
      var weekday = '';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (p.type === 'year') year = p.value;
        else if (p.type === 'month') month = p.value;
        else if (p.type === 'day') day = p.value;
        else if (p.type === 'weekday') weekday = p.value;
      }
      // weekday가 비어있으면 수동 계산 (fallback)
      if (!weekday) {
        var kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        weekday = WEEKDAYS_KR[kstDate.getUTCDay()];
      }
      return {
        date: year + '-' + month + '-' + day,
        weekday: weekday
      };
    } catch (e) {
      // Intl 실패 시 수동 +9시간 계산
      var kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      var y = kst.getUTCFullYear();
      var m = String(kst.getUTCMonth() + 1).padStart(2, '0');
      var dt = String(kst.getUTCDate()).padStart(2, '0');
      var wd = WEEKDAYS_KR[kst.getUTCDay()];
      return {
        date: y + '-' + m + '-' + dt,
        weekday: wd
      };
    }
  }

  /**
   * ISO 문자열에서 KST 기준 'YYYY-MM-DD' 날짜만 추출
   * @param {string} iso
   * @returns {string | null}
   */
  function kstDateString(iso) {
    var parts = kstDateParts(iso);
    return parts ? parts.date : null;
  }

  /**
   * ISO 문자열에서 KST 기준 요일만 추출
   * @param {string} iso
   * @returns {string | null}
   */
  function kstWeekday(iso) {
    var parts = kstDateParts(iso);
    return parts ? parts.weekday : null;
  }

  /**
   * refDate가 속한 주의 월요일(주 시작) KST 날짜 문자열 반환
   * @param {string} refDateISO
   * @returns {string | null} 'YYYY-MM-DD'
   */
  function weekStartDate(refDateISO) {
    var parts = kstDateParts(refDateISO);
    if (!parts) return null;
    var ref = new Date(parts.date + 'T00:00:00+09:00');
    // getDay: 0=일, 1=월, ..., 6=토
    var dayOfWeek = ref.getDay(); // KST 기준 요일
    // 월요일(1)을 주 시작으로: 월요일이면 0, 화요일이면 -1, ... 일요일이면 -6
    var diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    var monday = new Date(ref.getTime() + diff * 24 * 60 * 60 * 1000);
    var y = monday.getFullYear();
    var m = String(monday.getMonth() + 1).padStart(2, '0');
    var d = String(monday.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  /**
   * refDate가 속한 주의 일요일(주 끝) KST 날짜 문자열 반환
   * @param {string} refDateISO
   * @returns {string | null} 'YYYY-MM-DD'
   */
  function weekEndDate(refDateISO) {
    var start = weekStartDate(refDateISO);
    if (!start) return null;
    var d = new Date(start + 'T00:00:00+09:00');
    var sunday = new Date(d.getTime() + 6 * 24 * 60 * 60 * 1000);
    var y = sunday.getFullYear();
    var m = String(sunday.getMonth() + 1).padStart(2, '0');
    var dt = String(sunday.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dt;
  }

  /**
   * 두 KST 날짜 문자열 비교 (YYYY-MM-DD)
   * @returns {number} -1, 0, 1
   */
  function compareDateStr(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * 날짜 문자열에 일 수 더하기 (YYYY-MM-DD)
   * @param {string} dateStr
   * @param {number} days
   * @returns {string}
   */
  function addDays(dateStr, days) {
    var d = new Date(dateStr + 'T00:00:00+09:00');
    d.setDate(d.getDate() + days);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dt = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dt;
  }

  /**
   * 실제 파티( startsAt 보유 ) 필터링 판단
   * @param {Object} party
   * @param {string} mode
   * @param {Object} options {refDate, date}
   * @returns {boolean}
   */
  function matchesRealParty(party, mode, options) {
    var startsAt = party.startsAt;
    if (!startsAt) return false;
    var partyDate = kstDateString(startsAt);
    if (!partyDate) return false;
    var partyWeekday = kstWeekday(startsAt);
    var refDate = options.refDate || new Date().toISOString();

    switch (mode) {
      case 'week': {
        var weekStart = weekStartDate(refDate);
        var weekEnd = weekEndDate(refDate);
        if (!weekStart || !weekEnd) return false;
        return compareDateStr(partyDate, weekStart) >= 0 && compareDateStr(partyDate, weekEnd) <= 0;
      }
      case 'weekend': {
        // KST 요일이 토/일이고, refDate 날짜 <= partyDate <= refDate+6일 (다가오는 주말)
        if (partyWeekday !== '토' && partyWeekday !== '일') return false;
        var refDateStr = kstDateString(refDate);
        if (!refDateStr) return false;
        var refPlus6 = addDays(refDateStr, 6);
        return compareDateStr(partyDate, refDateStr) >= 0 && compareDateStr(partyDate, refPlus6) <= 0;
      }
      case 'date': {
        var targetDate = options.date;
        if (!targetDate) return false;
        return partyDate === targetDate;
      }
      default:
        return true; // 'all' 등
    }
  }

  /**
   * 예시 파티( isExample, days[] 보유 ) 필터링 판단
   * @param {Object} party
   * @param {string} mode
   * @param {Object} options {refDate, date}
   * @returns {boolean}
   */
  function matchesExampleParty(party, mode, options) {
    var days = Array.isArray(party.days) ? party.days : [];
    if (days.length === 0) return false;

    switch (mode) {
      case 'week':
        // 주는 모든 요일을 덮으므로 days가 비어있지 않으면 항상 표시
        return true;
      case 'weekend':
        // days에 '토' 또는 '일' 포함
        return days.indexOf('토') !== -1 || days.indexOf('일') !== -1;
      case 'date': {
        var targetDate = options.date;
        if (!targetDate) return false;
        var targetWeekday = kstWeekday(targetDate + 'T00:00:00+09:00');
        if (!targetWeekday) return false;
        return days.indexOf(targetWeekday) !== -1;
      }
      default:
        return true; // 'all' 등
    }
  }

  /**
   * 파티 배열 필터링
   * @param {Array} parties
   * @param {string} mode
   * @param {Object} options
   * @returns {Array} 새 배열 (입력 변형 금지, 요소는 얕은 복제)
   */
  function filter(parties, mode, options) {
    var opts = options || {};
    var refDate = opts.refDate || new Date().toISOString();
    var modeNormalized = (typeof mode === 'string' && MODES.indexOf(mode) !== -1) ? mode : 'all';

    if (!Array.isArray(parties)) return [];

    // 'all' 모드: 전체 얕은 복제 반환
    if (modeNormalized === 'all') {
      return parties.map(function (p) {
        return shallowClone(p);
      });
    }

    var result = [];
    for (var i = 0; i < parties.length; i++) {
      var party = parties[i];
      var matched = false;

      if (party && party.isExample === true) {
        matched = matchesExampleParty(party, modeNormalized, { refDate: refDate, date: opts.date });
      } else if (party && party.startsAt) {
        matched = matchesRealParty(party, modeNormalized, { refDate: refDate, date: opts.date });
      } else {
        // startsAt도 없고 isExample도 아닌 경우: 'all' 처럼 포함 (보수적)
        matched = true;
      }

      if (matched) {
        result.push(shallowClone(party));
      }
    }
    return result;
  }

  // 전역 노출
  window.PartyDateFilter = {
    MODES: MODES,
    kstDateParts: kstDateParts,
    filter: filter
  };
})();
