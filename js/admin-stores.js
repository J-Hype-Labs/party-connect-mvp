/**
 * 점포·적립금 (A4) — 점포 목록과 잔액, 점포 등록/수정, 충전·환불, 원장.
 * 적립금 원장은 수정할 수 없습니다(정정은 반대 방향 거래). 충전·환불은 확인 후에만 실행합니다.
 */
(function () {
  'use strict';
  const ui = () => window.ADMIN_UI;
  const TYPE = { CHARGE: ['충전', 'plus', '+'], DEDUCT: ['차감', 'minus', '-'], REFUND: ['환불', 'minus', '-'] };
  const S = { items: [], failed: '', loaded: false, content: null, lowOnly: false };

  async function open(content, opts) {
    S.content = content;
    S.lowOnly = !!(opts && opts.lowOnly);
    await load();
  }

  async function load() {
    S.loaded = false; render();
    try { S.items = await ui().api.stores(); S.failed = ''; }
    catch (e) { S.failed = e.message || '목록을 불러오지 못했습니다.'; }
    S.loaded = true; render();
  }

  function render() {
    const u = ui(), h = u.h, c = S.content;
    u.clear(c);
    c.appendChild(h('h1', { text: '점포·적립금' }));
    c.appendChild(h('div', { class: 'toolbar' },
      h('label', { class: 'field inline' },
        h('input', { id: 'store-low', type: 'checkbox', checked: S.lowOnly, onchange: function (e) { S.lowOnly = e.target.checked; render(); } }),
        h('span', { text: '잔액 부족만 (인당 수수료 미만)' })),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', id: 'store-new', type: 'button', onclick: function () { storeForm(null); }, text: '점포 등록' })));
    if (!S.loaded) return c.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (S.failed) return c.appendChild(h('div', { class: 'state-msg' }, h('p', { text: S.failed }), h('button', { class: 'btn', type: 'button', onclick: load, text: '다시 시도' })));
    const items = S.items.filter(function (s) { return !S.lowOnly || (s.isActive && s.prepaidBalance < s.defaultFeePerGuest); });
    if (!items.length) return c.appendChild(h('p', { class: 'state-msg', id: 'empty', text: S.lowOnly ? '잔액이 부족한 점포가 없습니다.' : '등록된 점포가 없습니다.' }));
    const list = h('ul', { class: 'cards', id: 'store-list' });
    items.forEach(function (s) { list.appendChild(card(s)); });
    c.appendChild(list);
  }

  function card(s) {
    const u = ui(), h = u.h;
    const low = s.isActive && s.prepaidBalance < s.defaultFeePerGuest;
    return h('li', { class: 'card', 'data-store-id': s.id },
      h('div', { class: 'card-head' }, h('strong', { text: s.name }),
        h('span', { class: 'badge ' + (s.isActive ? 'st-done' : 'st-muted'), text: s.isActive ? '운영 중' : '비활성' })),
      h('dl', { class: 'meta' },
        u.row('적립금', u.won(s.prepaidBalance) + (low ? ' (부족)' : '')),
        u.row('기본 수수료', u.won(s.defaultFeePerGuest) + ' / 인'),
        u.row('대표자', s.ownerName + ' · ' + s.phone),
        u.row('주소', (s.region ? s.region + ' · ' : '') + s.address)),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small primary', type: 'button', 'data-action': 'charge', onclick: function () { chargeDialog(s); }, text: '충전' }),
        h('button', { class: 'btn small danger', type: 'button', 'data-action': 'refund', onclick: function () { refundDialog(s); }, text: '환불' }),
        h('button', { class: 'btn small', type: 'button', 'data-action': 'ledger', onclick: function () { ledger(s); }, text: '원장' }),
        h('button', { class: 'btn small', type: 'button', 'data-action': 'edit', onclick: function () { storeForm(s); }, text: '수정' })));
  }

  function amountInput(id) {
    return ui().h('input', { id: id, type: 'number', min: '1', step: '1', required: true, inputmode: 'numeric' });
  }
  function parseAmount(v) {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function chargeDialog(s) {
    const u = ui(), h = u.h;
    const amount = amountInput('charge-amount');
    const depositor = h('input', { id: 'charge-depositor', required: true, maxlength: '50', placeholder: '입금자명' });
    const memo = h('input', { id: 'charge-memo', maxlength: '500', placeholder: '메모 (선택)' });
    const dlg = u.dialog('적립금 충전', h('div', null,
      h('p', { text: s.name + ' · 현재 ' + u.won(s.prepaidBalance) }),
      h('p', { class: 'hint', text: '입금을 확인한 뒤에만 충전하세요. 원장은 수정할 수 없습니다.' }),
      u.field('충전 금액 (원)', amount), u.field('입금자명', depositor), u.field('메모', memo)), '충전', false, async function () {
      const n = parseAmount(amount.value);
      if (!n) return '충전 금액을 1원 이상의 정수로 입력해 주세요.';
      if (!depositor.value.trim()) return '입금자명을 입력해 주세요.';
      try {
        await u.api.charge(s.id, { amount: n, depositorName: depositor.value.trim(), memo: memo.value.trim() || undefined });
        u.toast(u.won(n) + ' 충전했습니다.', 'ok'); await load(); return '';
      } catch (e) { return e.message || '충전하지 못했습니다.'; }
    });
    amount.focus();
    return dlg;
  }

  function refundDialog(s) {
    const u = ui(), h = u.h;
    const amount = amountInput('refund-amount');
    const memo = h('input', { id: 'refund-memo', maxlength: '500', placeholder: '메모 (선택)' });
    const dlg = u.dialog('적립금 환불', h('div', null,
      h('p', { text: s.name + ' · 현재 ' + u.won(s.prepaidBalance) }),
      h('p', { class: 'hint', text: '환불하면 잔액에서 바로 빠지며 되돌릴 수 없습니다. 실제 송금은 따로 진행해야 합니다.' }),
      u.field('환불 금액 (원)', amount), u.field('메모', memo)), '환불', true, async function () {
      const n = parseAmount(amount.value);
      if (!n) return '환불 금액을 1원 이상의 정수로 입력해 주세요.';
      if (n > s.prepaidBalance) return '현재 잔액(' + u.won(s.prepaidBalance) + ')보다 많이 환불할 수 없습니다.';
      try {
        await u.api.refund(s.id, { amount: n, memo: memo.value.trim() || undefined });
        u.toast(u.won(n) + ' 환불 처리했습니다.', 'ok'); await load(); return '';
      } catch (e) { return e.message || '환불하지 못했습니다.'; }
    });
    amount.focus();
    return dlg;
  }

  async function ledger(s) {
    const u = ui(), h = u.h;
    const list = h('ul', { class: 'ledger', id: 'ledger-list' }, h('li', { text: '불러오는 중…' }));
    const dlg = u.dialog(s.name + ' 원장', list, '닫기', false, async function () { return ''; });
    dlg.classList.add('wide');
    try {
      const rows = await u.api.deposits(s.id);
      u.clear(list);
      if (!rows.length) return list.appendChild(h('li', { text: '거래 내역이 없습니다.' }));
      rows.forEach(function (r) {
        const t = TYPE[r.type] || [r.type, '', ''];
        list.appendChild(h('li', null,
          h('span', null, h('strong', { text: t[0] }), ' ', u.fmtDate(r.createdAt), r.depositorName ? ' · ' + r.depositorName : '', r.memo ? ' · ' + r.memo : ''),
          h('span', { class: t[1], text: t[2] + u.won(r.amount) + ' → ' + u.won(r.balanceAfter) })));
      });
    } catch (e) {
      u.clear(list);
      list.appendChild(h('li', { text: e.message || '원장을 불러오지 못했습니다.' }));
    }
  }

  function storeForm(s) {
    const u = ui(), h = u.h;
    const f = {
      name: h('input', { id: 'sf-name', required: true, maxlength: '100', value: s ? s.name : '' }),
      owner: h('input', { id: 'sf-owner', required: true, maxlength: '50', value: s ? s.ownerName : '' }),
      phone: h('input', { id: 'sf-phone', required: true, maxlength: '20', inputmode: 'tel', placeholder: '01012345678', value: s ? s.phone : '' }),
      brn: s ? null : h('input', { id: 'sf-brn', required: true, maxlength: '12', placeholder: '123-45-67890' }),
      address: h('input', { id: 'sf-address', required: true, maxlength: '200', value: s ? s.address : '' }),
      region: h('input', { id: 'sf-region', maxlength: '50', placeholder: '예: 명동/을지로', value: s && s.region ? s.region : '' }),
      fee: h('input', { id: 'sf-fee', type: 'number', min: '0', step: '100', value: s ? String(s.defaultFeePerGuest) : '10000' }),
      active: s ? h('input', { id: 'sf-active', type: 'checkbox', checked: s.isActive }) : null,
    };
    const body = h('div', { class: 'form-grid' },
      u.field('점포명', f.name), u.field('대표자명', f.owner),
      u.field('연락처', f.phone), f.brn ? u.field('사업자등록번호', f.brn) : null,
      u.field('주소', f.address), u.field('지역 (웹 필터와 같은 값)', f.region),
      u.field('기본 수수료 (원/인)', f.fee),
      f.active ? h('label', { class: 'field inline' }, f.active, h('span', { text: '운영 중 (끄면 파티 목록에서 제외)' })) : null);
    const dlg = u.dialog(s ? '점포 수정' : '점포 등록', body, s ? '저장' : '등록', false, async function () {
      const fee = Number(f.fee.value);
      if (!f.name.value.trim() || !f.owner.value.trim() || !f.phone.value.trim() || !f.address.value.trim()) return '필수 항목을 모두 입력해 주세요.';
      if (!Number.isInteger(fee) || fee < 0) return '기본 수수료는 0 이상의 정수여야 합니다.';
      const payload = {
        name: f.name.value.trim(), ownerName: f.owner.value.trim(), phone: f.phone.value.trim(),
        address: f.address.value.trim(), region: f.region.value.trim() || null, defaultFeePerGuest: fee,
      };
      try {
        if (s) await u.api.updateStore(s.id, Object.assign({ isActive: f.active.checked }, payload));
        else await u.api.createStore(Object.assign({ businessRegNo: f.brn.value.trim() }, payload));
        u.toast(s ? '저장했습니다.' : '점포를 등록했습니다.', 'ok'); await load(); return '';
      } catch (e) { return e.message || '저장하지 못했습니다.'; }
    });
    dlg.classList.add('wide');
    f.name.focus();
  }

  window.ADMIN_SCREENS = window.ADMIN_SCREENS || {};
  window.ADMIN_SCREENS.stores = { open: open };
})();
