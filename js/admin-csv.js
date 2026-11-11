/**
 * 관리자 CSV 내보내기 도구 (정산 내역: 수동 정산·입금 대조용)
 * - 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙입니다.
 * - CSV 인젝션 방지: 문자열이 = + - @ 탭 CR 로 시작하면 앞에 ' 를 붙여 수식으로 해석되지 않게 합니다.
 *   (숫자 타입 값은 그대로 두고, 문자열 값만 처리합니다.)
 * - 서버를 호출하지 않는 순수 도구입니다. 데이터는 호출하는 화면이 기존 API 로 가져옵니다.
 */
(function () {
  'use strict';

  const BOM = '﻿';
  const FORMULA_START = /^[=+\-@\t\r]/;
  const TYPE_LABEL = { CHARGE: '충전', DEDUCT: '차감', REFUND: '환불' };

  // 셀 하나를 CSV 문자열로: 인젝션 방지 → 필요할 때만 따옴표로 감쌈
  function cell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    let s = String(v);
    if (FORMULA_START.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function build(headers, rows) {
    return BOM + [headers].concat(rows).map(function (r) { return r.map(cell).join(','); }).join('\r\n') + '\r\n';
  }

  const kstFmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  // ISO → 한국 시간 "YYYY-MM-DD HH:mm:ss"
  function kst(iso) {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? kstFmt.format(d) : '';
  }

  const LEDGER_HEADERS = ['일시(KST)', '점포', '구분', '금액', '변경 전 잔액', '변경 후 잔액', '입금자명', '메모', '신청 ID', '거래 ID'];

  // 점포 원장(API 응답: 최신순) → CSV 문자열(오래된 순)
  function ledgerCsv(store, deposits) {
    const rows = deposits.slice().reverse().map(function (d) {
      return [kst(d.createdAt), store.name, TYPE_LABEL[d.type] || d.type, d.amount, d.balanceBefore, d.balanceAfter,
        d.depositorName, d.memo, d.applicationId, d.id];
    });
    return build(LEDGER_HEADERS, rows);
  }

  // 파일 이름에 쓸 수 없는 문자를 _ 로 바꿈 (한글·영문·숫자·-_ 만 남김)
  function fileName(storeName, now) {
    const safe = String(storeName || 'store').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'store';
    return 'hypeconnect-ledger-' + safe + '-' + kst((now || new Date()).toISOString()).slice(0, 10).replace(/-/g, '') + '.csv';
  }

  function download(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  window.ADMIN_CSV = { cell: cell, build: build, kst: kst, ledgerCsv: ledgerCsv, fileName: fileName, download: download };
})();
