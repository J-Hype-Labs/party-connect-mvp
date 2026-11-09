/**
 * 관리자 페이지: 파티(A4)·점포/적립금(A5) 화면
 * - js/admin-app.js 가 노출하는 window.ADMIN_UI(h, dialog, toast …)를 사용합니다.
 * - 사용자 입력은 textContent / value 로만 넣습니다 (innerHTML 금지).
 * - 날짜는 한국 시간(KST, +09:00)으로 입력받아 서버에는 ISO 로 보냅니다.
 */
(function () {
  'use strict';

  const api = window.ADMIN_API;
  const ui = function () { return window.ADMIN_UI; };

  // ---------------------------------------------------------------- 공통 유틸
  function toKstLocal(iso) {
    if (!iso) return '';
    return new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
  }
  function fromKstLocal(v) {
    if (!v) return null;
    const d = new Date(v + ':00+09:00');
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  function field(label, input, hint) {
    const h = ui().h;
    return h('label', { class: 'field' }, h('span', { text: label }), input, hint ? h('small', { class: 'hint', text: hint }) : null);
  }
  function input(id, type, value, extra) {
    return ui().h('input', Object.assign({ id: id, type: type || 'text', value: value === undefined || value === null ? '' : String(value), autocomplete: 'off' }, extra || {}));
  }
  function select(id, options, current) {
    const h = ui().h;
    return h('select', { id: id }, options.map(function (o) { return h('option', { value: o[0], text: o[1], selected: current === o[0] }); }));
  }
  function intOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isInteger(n) ? n : NaN;
  }
  function failText(view) {
    const h = ui().h;
    return h('div', { class: 'state-msg' }, h('p', { text: view.failed }),
      h('button', { class: 'btn', type: 'button', onclick: view.open, text: '다시 시도' }));
  }

  // ================================================================ 파티
  const PARTY_STATUS = {
    DRAFT: ['작성 중', 'st-muted'], OPEN: ['모집 중', 'st-approved'], CLOSED: ['모집 마감', 'st-visited'],
    CANCELLED: ['취소', 'st-bad'], FINISHED: ['종료', 'st-done'],
  };
  const CATEGORIES = ['혼술바', '소개팅', '소셜파티'];
  // 상태 전환 버튼 (서버가 허용하지 않는 전환은 서버 메시지를 그대로 보여 줍니다)
  const PARTY_FLOW = {
    DRAFT: [['OPEN', '공개', true], ['CANCELLED', '취소', false]],
    OPEN: [['CLOSED', '모집 마감', false], ['CANCELLED', '취소', false]],
    CLOSED: [['OPEN', '다시 모집', false], ['FINISHED', '종료', true], ['CANCELLED', '취소', false]],
  };

  const pv = { status: '', items: [], stores: [], loaded: false, failed: '', busy: {}, content: null };

  async function openParties(content) {
    if (content) pv.content = content;
    pv.loaded = false;
    renderParties();
    try {
      const r = await Promise.all([api.parties({ status: pv.status }), api.stores()]);
      pv.items = r[0]; pv.stores = r[1]; pv.failed = '';
    } catch (e) { pv.failed = e.message || '목록을 불러오지 못했습니다.'; }
    pv.loaded = true;
    renderParties();
  }

  function renderParties() {
    const c = pv.content;
    if (!c || !c.isConnected || !ui().isActive('parties')) return;
    const U = ui(), h = U.h;
    U.clear(c);
    c.appendChild(h('div', { class: 'title-row' }, h('h1', { text: '파티 관리' }),
      h('button', { class: 'btn primary small', id: 'new-party', type: 'button', onclick: function () { partyForm(null); }, text: '새 파티' })));
    c.appendChild(h('div', { class: 'filters' },
      h('select', { id: 'filter-party-status', 'aria-label': '상태 필터', onchange: function (e) { pv.status = e.target.value; openParties(); } },
        h('option', { value: '', text: '전체 상태' }),
        Object.keys(PARTY_STATUS).map(function (k) { return h('option', { value: k, text: PARTY_STATUS[k][0], selected: pv.status === k }); }))));
    if (!pv.loaded) return c.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (pv.failed) return c.appendChild(failText({ failed: pv.failed, open: function () { openParties(); } }));
    if (pv.items.length === 0) return c.appendChild(h('p', { class: 'state-msg', id: 'empty-parties', text: '등록된 파티가 없습니다. "새 파티"로 등록하세요.' }));
    const list = h('ul', { class: 'cards', id: 'party-list' });
    pv.items.forEach(function (p) { list.appendChild(partyCard(p)); });
    c.appendChild(list);
  }

  function partyCard(p) {
    const U = ui(), h = U.h;
    const st = PARTY_STATUS[p.status] || [p.status, 'st-muted'];
    const busy = !!pv.busy[p.id];
    const flow = (PARTY_FLOW[p.status] || []).map(function (f) {
      return h('button', {
        class: 'btn small ' + (f[2] ? 'primary' : (f[0] === 'CANCELLED' ? 'danger' : '')), type: 'button', disabled: busy, 'data-action': 'to-' + f[0],
        onclick: function () { changeStatus(p, f[0], f[1]); }, text: f[1],
      });
    });
    return h('li', { class: 'card', 'data-party-id': p.id },
      h('div', { class: 'card-head' }, h('strong', { text: p.title }), h('span', { class: 'badge ' + st[1], text: st[0] })),
      h('dl', { class: 'meta' },
        kv('점포', p.storeName || '-'),
        kv('일시', U.fmtDate(p.startsAt) + ' ~ ' + U.fmtDate(p.endsAt)),
        kv('모집 마감', U.fmtDate(p.recruitDeadline)),
        kv('정원', '선정 ' + p.selectedCount + ' / ' + p.capacity + ' · 신청 ' + p.applicantCount),
        kv('수수료', U.won(p.feePerGuest) + ' / 인'),
        p.category ? kv('카테고리', p.category) : null,
        p.isFeatured ? kv('추천', '추천 파티') : null),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small', type: 'button', disabled: busy, 'data-action': 'edit', onclick: function () { partyForm(p); }, text: '수정' }),
        flow));
  }

  function kv(k, v) { const h = ui().h; return h('div', null, h('dt', { text: k }), h('dd', { text: v })); }

  function changeStatus(p, to, label) {
    const U = ui(), h = U.h;
    const danger = to === 'CANCELLED';
    const note = to === 'CANCELLED' ? '취소하면 사이트에서 사라집니다.' : to === 'OPEN' ? '사이트에 공개되어 신청을 받습니다.' : to === 'CLOSED' ? '더 이상 신청을 받지 않습니다.' : '';
    U.dialog('"' + p.title + '" — ' + label + '할까요?', h('p', { text: note }), label, danger, async function () {
      pv.busy[p.id] = true;
      try {
        await api.updateParty(p.id, { status: to });
        U.toast(label + ' 처리했습니다.', 'ok');
        delete pv.busy[p.id];
        await openParties();
        return '';
      } catch (e) {
        delete pv.busy[p.id];
        return e.message || '처리하지 못했습니다.';
      }
    });
  }

  function partyForm(p) {
    const U = ui(), h = U.h;
    const isNew = !p;
    const f = {};
    f.store = select('pf-store', [['', '점포 선택']].concat(pv.stores.filter(function (s) { return s.isActive; }).map(function (s) { return [s.id, s.name]; })), p ? p.storeId : '');
    f.store.required = true;
    f.title = input('pf-title', 'text', p && p.title, { maxlength: '100', required: true });
    f.benefit = input('pf-benefit', 'text', p && p.benefit, { maxlength: '500', required: true });
    f.description = h('textarea', { id: 'pf-description', rows: '3', maxlength: '2000', text: p && p.description || '' });
    f.category = select('pf-category', [['', '선택 안 함']].concat(CATEGORIES.map(function (c) { return [c, c]; })), p && p.category || '');
    f.startsAt = input('pf-starts', 'datetime-local', toKstLocal(p && p.startsAt), { required: true });
    f.endsAt = input('pf-ends', 'datetime-local', toKstLocal(p && p.endsAt), { required: true });
    f.deadline = input('pf-deadline', 'datetime-local', toKstLocal(p && p.recruitDeadline), { required: true });
    f.capacity = input('pf-capacity', 'number', p && p.capacity, { min: '1', max: '1000', required: true });
    f.fee = input('pf-fee', 'number', p && p.feePerGuest, { min: '0', max: '10000000' });
    f.featured = h('input', { id: 'pf-featured', type: 'checkbox', checked: !!(p && p.isFeatured) });
    f.status = select('pf-status', [['DRAFT', '작성 중 (비공개)'], ['OPEN', '바로 공개']], 'DRAFT');

    const body = h('div', { class: 'form' },
      isNew ? field('점포', f.store) : h('p', { text: '점포: ' + (p.storeName || '-') }),
      field('제목', f.title), field('혜택', f.benefit, '게스트에게 보이는 혜택 문구'),
      field('설명 (선택)', f.description), field('카테고리', f.category),
      field('시작 (한국 시간)', f.startsAt), field('종료 (한국 시간)', f.endsAt), field('모집 마감 (한국 시간)', f.deadline),
      field('정원', f.capacity),
      field('인당 수수료 (원)', f.fee, isNew ? '비우면 점포 기본 수수료가 적용됩니다.' : '이미 선정된 신청에는 영향이 없습니다.'),
      h('label', { class: 'field check' }, f.featured, h('span', { text: '추천 파티로 표시' })),
      isNew ? field('등록 상태', f.status) : null);

    U.dialog(isNew ? '새 파티 등록' : '파티 수정', body, isNew ? '등록' : '저장', false, async function () {
      const starts = fromKstLocal(f.startsAt.value), ends = fromKstLocal(f.endsAt.value), deadline = fromKstLocal(f.deadline.value);
      const cap = intOrNull(f.capacity.value), fee = intOrNull(f.fee.value);
      if (isNew && !f.store.value) return '점포를 선택해 주세요.';
      if (!f.title.value.trim()) return '제목을 입력해 주세요.';
      if (!f.benefit.value.trim()) return '혜택을 입력해 주세요.';
      if (!starts || !ends || !deadline) return '시작·종료·모집 마감 시각을 모두 입력해 주세요.';
      if (new Date(ends) <= new Date(starts)) return '종료 시각은 시작 시각보다 늦어야 합니다.';
      if (new Date(deadline) > new Date(starts)) return '모집 마감은 시작 시각보다 늦을 수 없습니다.';
      if (cap === null || Number.isNaN(cap) || cap < 1) return '정원은 1 이상의 정수로 입력해 주세요.';
      if (Number.isNaN(fee) || (fee !== null && fee < 0)) return '수수료는 0 이상의 정수로 입력해 주세요.';
      const payload = {
        title: f.title.value.trim(), benefit: f.benefit.value.trim(), description: f.description.value.trim(),
        category: f.category.value, startsAt: starts, endsAt: ends, recruitDeadline: deadline, capacity: cap,
        isFeatured: f.featured.checked,
      };
      if (fee !== null) payload.feePerGuest = fee;
      try {
        if (isNew) {
          payload.storeId = f.store.value; payload.status = f.status.value;
          await api.createParty(payload);
        } else {
          await api.updateParty(p.id, payload);
        }
      } catch (e) { return e.message || '저장하지 못했습니다.'; }
      U.toast(isNew ? '파티를 등록했습니다.' : '저장했습니다.', 'ok');
      openParties();
      return '';
    });
  }

  // ================================================================ 점포·적립금
  const sv = { items: [], loaded: false, failed: '', content: null };

  async function openStores(content) {
    if (content) sv.content = content;
    sv.loaded = false;
    renderStores();
    try { sv.items = await api.stores(); sv.failed = ''; }
    catch (e) { sv.failed = e.message || '목록을 불러오지 못했습니다.'; }
    sv.loaded = true;
    renderStores();
  }

  function renderStores() {
    const c = sv.content;
    if (!c || !c.isConnected || !ui().isActive('stores')) return;
    const U = ui(), h = U.h;
    U.clear(c);
    c.appendChild(h('div', { class: 'title-row' }, h('h1', { text: '점포·적립금' }),
      h('button', { class: 'btn primary small', id: 'new-store', type: 'button', onclick: function () { storeForm(null); }, text: '새 점포' })));
    if (!sv.loaded) return c.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (sv.failed) return c.appendChild(failText({ failed: sv.failed, open: function () { openStores(); } }));
    if (sv.items.length === 0) return c.appendChild(h('p', { class: 'state-msg', id: 'empty-stores', text: '등록된 점포가 없습니다. "새 점포"로 등록하세요.' }));
    const list = h('ul', { class: 'cards', id: 'store-list' });
    sv.items.forEach(function (s) { list.appendChild(storeCard(s)); });
    c.appendChild(list);
  }

  function storeCard(s) {
    const U = ui(), h = U.h;
    return h('li', { class: 'card', 'data-store-id': s.id },
      h('div', { class: 'card-head' }, h('strong', { text: s.name }),
        h('span', { class: 'badge ' + (s.isActive ? 'st-done' : 'st-muted'), text: s.isActive ? '운영 중' : '운영 중지' })),
      h('dl', { class: 'meta' },
        kv('적립금', U.won(s.prepaidBalance)),
        kv('기본 수수료', U.won(s.defaultFeePerGuest) + ' / 인'),
        kv('대표자', s.ownerName), kv('연락처', s.phone),
        kv('주소', s.address || '-'), s.region ? kv('지역', s.region) : null),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small primary', type: 'button', 'data-action': 'charge', onclick: function () { moneyDialog(s, 'charge'); }, text: '충전' }),
        h('button', { class: 'btn small', type: 'button', 'data-action': 'refund', onclick: function () { moneyDialog(s, 'refund'); }, text: '환불' }),
        h('button', { class: 'btn small', type: 'button', 'data-action': 'history', onclick: function () { historyDialog(s); }, text: '내역' }),
        h('button', { class: 'btn small', type: 'button', 'data-action': 'edit', onclick: function () { storeForm(s); }, text: '수정' }),
        h('button', { class: 'btn small ' + (s.isActive ? 'danger' : ''), type: 'button', 'data-action': 'toggle', onclick: function () { toggleActive(s); }, text: s.isActive ? '운영 중지' : '운영 재개' })));
  }

  function toggleActive(s) {
    const U = ui(), h = U.h;
    const next = !s.isActive;
    U.dialog('"' + s.name + '" ' + (next ? '운영을 재개할까요?' : '운영을 중지할까요?'),
      h('p', { text: next ? '파티를 다시 등록할 수 있습니다.' : '운영을 중지하면 새 파티를 등록할 수 없습니다. 기존 신청은 영향이 없습니다.' }),
      next ? '재개' : '중지', !next, async function () {
        try { await api.updateStore(s.id, { isActive: next }); } catch (e) { return e.message || '처리하지 못했습니다.'; }
        U.toast('처리했습니다.', 'ok');
        openStores();
        return '';
      });
  }

  function storeForm(s) {
    const U = ui(), h = U.h;
    const isNew = !s;
    const f = {
      name: input('sf-name', 'text', s && s.name, { maxlength: '100', required: true }),
      owner: input('sf-owner', 'text', s && s.ownerName, { maxlength: '50', required: true }),
      phone: input('sf-phone', 'tel', s && s.phone, { maxlength: '20', required: true, placeholder: '01012345678' }),
      brn: input('sf-brn', 'text', '', { maxlength: '12', required: true, placeholder: '123-45-67890' }),
      address: input('sf-address', 'text', '', { maxlength: '200', required: isNew }),
      detail: input('sf-detail', 'text', '', { maxlength: '200' }),
      region: input('sf-region', 'text', s && s.region, { maxlength: '50', placeholder: '예: 강남' }),
      insta: input('sf-insta', 'text', '', { maxlength: '50' }),
      fee: input('sf-fee', 'number', s && s.defaultFeePerGuest, { min: '0', max: '10000000' }),
    };
    const body = h('div', { class: 'form' },
      field('점포명', f.name), field('대표자명', f.owner), field('연락처', f.phone),
      isNew ? field('사업자등록번호', f.brn, '등록 후에는 수정할 수 없습니다.') : null,
      field('주소', f.address, isNew ? null : '비워 두면 주소를 바꾸지 않습니다.'),
      field('상세 주소 (선택)', f.detail), field('지역', f.region), field('인스타그램 (선택)', f.insta),
      field('기본 수수료 (원/인)', f.fee));
    if (!isNew) f.brn.required = false;

    U.dialog(isNew ? '새 점포 등록' : '점포 수정', body, isNew ? '등록' : '저장', false, async function () {
      const fee = intOrNull(f.fee.value);
      if (!f.name.value.trim()) return '점포명을 입력해 주세요.';
      if (!f.owner.value.trim()) return '대표자명을 입력해 주세요.';
      if (!/^[0-9-]{9,20}$/.test(f.phone.value.trim())) return '연락처를 정확히 입력해 주세요. (예: 01012345678)';
      if (isNew && !/^\d{3}-\d{2}-\d{5}$/.test(f.brn.value.trim())) return '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
      if (isNew && !f.address.value.trim()) return '주소를 입력해 주세요.';
      if (Number.isNaN(fee) || (fee !== null && fee < 0)) return '수수료는 0 이상의 정수로 입력해 주세요.';
      const payload = { name: f.name.value.trim(), ownerName: f.owner.value.trim(), phone: f.phone.value.trim(), region: f.region.value.trim() };
      if (f.address.value.trim()) payload.address = f.address.value.trim();
      if (f.detail.value.trim()) payload.addressDetail = f.detail.value.trim();
      if (f.insta.value.trim()) payload.instagram = f.insta.value.trim();
      if (fee !== null) payload.defaultFeePerGuest = fee;
      try {
        if (isNew) { payload.businessRegNo = f.brn.value.trim(); await api.createStore(payload); }
        else await api.updateStore(s.id, payload);
      } catch (e) { return e.message || '저장하지 못했습니다.'; }
      U.toast(isNew ? '점포를 등록했습니다.' : '저장했습니다.', 'ok');
      openStores();
      return '';
    });
  }

  // 충전/환불: 적립금 원장은 되돌릴 수 없으므로 금액을 확인 문구로 다시 보여 줍니다.
  function moneyDialog(s, kind) {
    const U = ui(), h = U.h;
    const isCharge = kind === 'charge';
    const amount = input('md-amount', 'number', '', { min: '1', max: '1000000000', required: true });
    const depositor = input('md-depositor', 'text', '', { maxlength: '50', required: isCharge });
    const memo = input('md-memo', 'text', '', { maxlength: '500' });
    const body = h('div', { class: 'form' },
      h('p', { text: s.name + ' · 현재 적립금 ' + U.won(s.prepaidBalance) }),
      field(isCharge ? '충전 금액 (원)' : '환불 금액 (원)', amount),
      isCharge ? field('입금자명', depositor) : null,
      field('메모 (선택)', memo),
      h('p', { class: 'hint', text: '적립금 원장은 수정할 수 없습니다. 금액을 확인하세요.' }));
    U.dialog(isCharge ? '적립금 충전' : '적립금 환불', body, isCharge ? '충전' : '환불', !isCharge, async function () {
      const n = intOrNull(amount.value);
      if (n === null || Number.isNaN(n) || n < 1) return '금액은 1 이상의 정수로 입력해 주세요.';
      if (isCharge && !depositor.value.trim()) return '입금자명을 입력해 주세요.';
      if (!isCharge && n > s.prepaidBalance) return '환불 금액이 현재 적립금보다 큽니다.';
      try {
        if (isCharge) await api.charge(s.id, { amount: n, depositorName: depositor.value.trim(), memo: memo.value.trim() });
        else await api.refund(s.id, { amount: n, memo: memo.value.trim() });
      } catch (e) { return e.message || '처리하지 못했습니다.'; }
      U.toast((isCharge ? '충전' : '환불') + '했습니다. (' + U.won(n) + ')', 'ok');
      openStores();
      return '';
    });
  }

  const TYPE_LABEL = { CHARGE: '충전', DEDUCT: '차감', REFUND: '환불' };
  async function historyDialog(s) {
    const U = ui(), h = U.h;
    const box = h('div', null, h('p', { class: 'state-msg', text: '불러오는 중…' }));
    U.dialog(s.name + ' 적립금 내역', box, '닫기', false, async function () { return ''; });
    try {
      const rows = await api.deposits(s.id);
      U.clear(box);
      if (rows.length === 0) return box.appendChild(h('p', { class: 'state-msg', text: '내역이 없습니다.' }));
      const ul = h('ul', { class: 'history', id: 'deposit-history' });
      rows.forEach(function (d) {
        ul.appendChild(h('li', null,
          h('span', { text: U.fmtDate(d.createdAt) + ' · ' + (TYPE_LABEL[d.type] || d.type) }),
          h('strong', { text: U.won(d.amount) }),
          h('small', { text: '잔액 ' + U.won(d.balanceAfter) + (d.depositorName ? ' · ' + d.depositorName : '') + (d.memo ? ' · ' + d.memo : '') })));
      });
      box.appendChild(ul);
    } catch (e) {
      U.clear(box);
      box.appendChild(h('p', { class: 'state-msg', text: e.message || '내역을 불러오지 못했습니다.' }));
    }
  }

  window.ADMIN_VIEWS = { parties: openParties, stores: openStores };
})();
