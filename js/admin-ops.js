/**
 * 관리자 페이지: 대시보드(A1)·게스트(A6) 화면
 * - js/admin-app.js 가 노출하는 window.ADMIN_UI 를 사용합니다. 사용자 입력은 textContent 로만 넣습니다.
 * - 대시보드 숫자는 서버(GET /admin/summary) 집계 그대로이며, 화면에서 다시 계산하지 않습니다.
 */
(function () {
  'use strict';

  const api = window.ADMIN_API;
  const ui = function () { return window.ADMIN_UI; };

  function kv(k, v) { const h = ui().h; return h('div', null, h('dt', { text: k }), h('dd', { text: v })); }

  // ================================================================ 대시보드
  const dv = { data: null, loaded: false, failed: '', content: null };

  async function openDashboard(content) {
    if (content) dv.content = content;
    dv.loaded = false;
    renderDashboard();
    try { dv.data = await api.summary(); dv.failed = ''; }
    catch (e) { dv.failed = e.message || '집계를 불러오지 못했습니다.'; }
    dv.loaded = true;
    renderDashboard();
  }

  // [키, 제목, 설명, 이동할 화면]
  const TILES = [
    ['pendingApplications', '선정 대기 신청', '검토가 필요한 신청', 'applications'],
    ['openParties', '모집 중인 파티', '지금 신청을 받는 파티', 'parties'],
    ['partiesThisWeek', '이번 주 파티', '7일 안에 시작하는 파티', 'parties'],
    ['lowBalanceStores', '적립금 부족 점포', '다가오는 파티의 인당 수수료보다 잔액이 적은 점포', 'stores'],
    ['blockedGuests', '차단된 게스트', '수동 차단 상태인 게스트', 'guests'],
  ];

  function renderDashboard() {
    const c = dv.content;
    if (!c || !c.isConnected || !ui().isActive('dashboard')) return;
    const U = ui(), h = U.h;
    U.clear(c);
    c.appendChild(h('div', { class: 'title-row' }, h('h1', { text: '대시보드' }),
      h('button', { class: 'btn small', id: 'refresh-dashboard', type: 'button', onclick: function () { openDashboard(); }, text: '새로고침' })));
    if (!dv.loaded) return c.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (dv.failed) {
      return c.appendChild(h('div', { class: 'state-msg' }, h('p', { text: dv.failed }),
        h('button', { class: 'btn', type: 'button', onclick: function () { openDashboard(); }, text: '다시 시도' })));
    }
    const grid = h('div', { class: 'tiles', id: 'dashboard-tiles' });
    TILES.forEach(function (t) {
      const n = dv.data[t[0]];
      const warn = (t[0] === 'pendingApplications' || t[0] === 'lowBalanceStores') && n > 0;
      grid.appendChild(h('button', {
        class: 'tile' + (warn ? ' warn' : ''), type: 'button', 'data-tile': t[0], onclick: function () { U.navigate(t[3]); },
      }, h('span', { class: 'tile-num', text: String(n === undefined || n === null ? '-' : n) }),
        h('strong', { text: t[1] }), h('small', { text: t[2] })));
    });
    c.appendChild(grid);
    c.appendChild(h('p', { class: 'hint', text: '기준 시각 ' + U.fmtDate(dv.data.asOf) + ' · 숫자를 누르면 해당 화면으로 이동합니다.' }));
  }

  // ================================================================ 게스트
  const gv = { blockedOnly: false, q: '', items: [], loaded: false, failed: '', content: null };

  async function openGuests(content) {
    if (content) gv.content = content;
    gv.loaded = false;
    renderGuests();
    try { gv.items = await api.guests({ blocked: gv.blockedOnly ? '1' : '' }); gv.failed = ''; }
    catch (e) { gv.failed = e.message || '목록을 불러오지 못했습니다.'; }
    gv.loaded = true;
    renderGuests();
  }

  // 수동 차단 또는 벌점으로 인한 자동 제한(blockedUntil 이 미래)
  function restriction(g) {
    if (g.isBlocked) return { label: '차단됨', cls: 'st-bad', manual: true };
    if (g.blockedUntil && new Date(g.blockedUntil) > new Date()) return { label: '자동 제한', cls: 'st-visited', manual: false };
    return { label: '정상', cls: 'st-done', manual: false };
  }

  function renderGuests() {
    const c = gv.content;
    if (!c || !c.isConnected || !ui().isActive('guests')) return;
    const U = ui(), h = U.h;
    U.clear(c);
    c.appendChild(h('div', { class: 'title-row' }, h('h1', { text: '게스트' })));
    c.appendChild(h('div', { class: 'filters' },
      h('input', {
        id: 'guest-search', type: 'search', 'aria-label': '이름 또는 연락처 검색', placeholder: '이름·연락처 검색', value: gv.q, autocomplete: 'off',
        oninput: function (e) { gv.q = e.target.value; renderList(); },
      }),
      h('label', { class: 'field check' },
        h('input', { id: 'guest-blocked-only', type: 'checkbox', checked: gv.blockedOnly, onchange: function (e) { gv.blockedOnly = e.target.checked; openGuests(); } }),
        h('span', { text: '제한된 게스트만' }))));
    c.appendChild(h('div', { id: 'guest-body' }));
    renderList();
  }

  function renderList() {
    const body = gv.content && gv.content.querySelector('#guest-body');
    if (!body || !ui().isActive('guests')) return;
    const U = ui(), h = U.h;
    U.clear(body);
    if (!gv.loaded) return body.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (gv.failed) {
      return body.appendChild(h('div', { class: 'state-msg' }, h('p', { text: gv.failed }),
        h('button', { class: 'btn', type: 'button', onclick: function () { openGuests(); }, text: '다시 시도' })));
    }
    const q = gv.q.trim().toLowerCase();
    const items = q ? gv.items.filter(function (g) {
      return String(g.name || '').toLowerCase().indexOf(q) >= 0 || String(g.phone || '').replace(/-/g, '').indexOf(q.replace(/-/g, '')) >= 0;
    }) : gv.items;
    if (items.length === 0) return body.appendChild(h('p', { class: 'state-msg', id: 'empty-guests', text: '조건에 맞는 게스트가 없습니다.' }));
    const list = h('ul', { class: 'cards', id: 'guest-list' });
    items.forEach(function (g) { list.appendChild(guestCard(g)); });
    body.appendChild(list);
  }

  function guestCard(g) {
    const U = ui(), h = U.h;
    const r = restriction(g);
    const restricted = r.label !== '정상';
    return h('li', { class: 'card', 'data-guest-id': g.id },
      h('div', { class: 'card-head' }, h('strong', { text: g.name || '(이름 없음)' }), h('span', { class: 'badge ' + r.cls, text: r.label })),
      h('dl', { class: 'meta' },
        kv('연락처', g.phone || '-'),
        g.instagram ? kv('인스타그램', g.instagram) : null,
        kv('노쇼', (g.noshowCount || 0) + '회'),
        kv('벌점', String(g.penaltyCount || 0)),
        !r.manual && r.label === '자동 제한' ? kv('제한 해제', U.fmtDate(g.blockedUntil)) : null,
        kv('가입', U.fmtDate(g.createdAt))),
      h('div', { class: 'actions' },
        h('button', {
          class: 'btn small ' + (restricted ? '' : 'danger'), type: 'button', 'data-action': restricted ? 'unblock' : 'block',
          onclick: function () { confirmBlock(g, !restricted); }, text: restricted ? '제한 해제' : '차단',
        })));
  }

  function confirmBlock(g, block) {
    const U = ui(), h = U.h;
    const note = block
      ? '차단하면 이 게스트는 새 파티에 신청할 수 없습니다. 이미 진행 중인 신청은 그대로입니다.'
      : '해제하면 수동 차단과 벌점에 의한 자동 제한이 모두 풀려 다시 신청할 수 있습니다.';
    U.dialog((g.name || '게스트') + ' 님을 ' + (block ? '차단할까요?' : '제한 해제할까요?'), h('p', { text: note }),
      block ? '차단' : '해제', block, async function () {
        try { await api.blockGuest(g.id, block); } catch (e) { return e.message || '처리하지 못했습니다.'; }
        U.toast(block ? '차단했습니다.' : '제한을 해제했습니다.', 'ok');
        openGuests();
        return '';
      });
  }

  window.ADMIN_VIEWS = Object.assign(window.ADMIN_VIEWS || {}, { dashboard: openDashboard, guests: openGuests });
})();
