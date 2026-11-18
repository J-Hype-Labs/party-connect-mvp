/**
 * 관리자 화면 — 관리 행위 기록 표시 (M-12 / Q-14 참고).
 * - 표시 전용 모듈: 서버가 저장한 감사 레코드를 읽기만 한다. 클라이언트 생성·조작 금지, 네트워크 없음.
 * - 서버 계약 초안: docs/ADMIN_AUDIT_API_CONTRACT.md (테이블·엔드포인트 구현 전제, 웹은 미연동).
 * - 시각은 admin-app.js fmtDate 와 같은 관례(Intl ko-KR, timeZone Asia/Seoul, hour12:false)로 KST M/D HH:MM.
 * - summarize({actorName, action, at}) → '처리: 이름 M/D HH:MM' 한국어 한 줄(시각 불명이면 시각 생략).
 * - merge(applications, audits) → 신청 id 기준 가장 최근 레코드를 `audit` 키(없으면 null)로 붙인 복사본을 반환.
 *   원본 배열·레코드는 변형하지 않는다(얕은 복사).
 */
(function () {
  'use strict';

  const ACTION_LABELS = {
    approve: '선정',
    reject: '반려',
    'verify-visit': '방문 인증',
    'request-revision': '보완 요청',
    complete: '최종 승인',
    noshow: '노쇼',
    block: '차단',
  };

  // 시각은 계약(문서)대로 KST 'M/D HH:MM' 고정 형식. Intl 의 '11. 20.' 표기와 다르므로 직접 조립한다.
  const STAMP = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  function stamp(at) {
    if (at === undefined || at === null || at === '') return '';
    const d = at instanceof Date ? at : new Date(at);
    if (isNaN(d.getTime())) return '';
    const parts = {};
    STAMP.formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    const hh = String(parts.hour || '').padStart(2, '0');
    const mm = String(parts.minute || '').padStart(2, '0');
    if (!parts.month || !parts.day || !hh) return '';
    return Number(parts.month) + '/' + Number(parts.day) + ' ' + hh + ':' + mm;
  }

  function stampMs(at) {
    if (at === undefined || at === null || at === '') return -Infinity;
    const d = at instanceof Date ? at.getTime() : (typeof at === 'number' ? at : Date.parse(at));
    return isNaN(d) ? -Infinity : d;
  }

  function summarize(record) {
    const r = record && typeof record === 'object' ? record : {};
    const name = typeof r.actorName === 'string' && r.actorName.trim() !== '' ? r.actorName.trim() : '알 수 없음';
    const s = stamp(r.at);
    return s ? '처리: ' + name + ' ' + s : '처리: ' + name;
  }

  function merge(applications, audits) {
    const list = Array.isArray(applications) ? applications : [];
    const records = Array.isArray(audits) ? audits : [];
    const latest = new Map();
    records.forEach(function (rec) {
      if (!rec || typeof rec !== 'object') return;
      const id = rec.applicationId;
      if (id === undefined || id === null || id === '') return;
      const key = String(id);
      const t = stampMs(rec.at);
      const prev = latest.get(key);
      if (!prev || t >= prev.t) latest.set(key, { t: t, rec: rec });
    });
    return list.map(function (a) {
      const copy = Object.assign({}, a);
      const hit = a && a.id !== undefined && a.id !== null ? latest.get(String(a.id)) : null;
      copy.audit = hit ? Object.assign({}, hit.rec) : null;
      return copy;
    });
  }

  window.AdminAudit = { summarize: summarize, ACTION_LABELS: ACTION_LABELS, merge: merge };
})();
