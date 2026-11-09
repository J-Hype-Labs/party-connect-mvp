/**
 * 관리자 대시보드 (A1) — GET /admin/summary 의 숫자를 카드로 보여 주고, 카드를 누르면 해당 목록으로 이동합니다.
 */
(function () {
  'use strict';
  const UI = () => window.ADMIN_UI;
  const api = () => window.ADMIN_API;

  const CARDS = [
    ['pendingApplications', '선정 대기 신청', '명 처리 필요', function (ui) { ui.navigate('applications', { status: 'APPLIED', slotId: '' }); }],
    ['partiesThisWeek', '이번 주 파티', '개', function (ui) { ui.navigate('parties'); }],
    ['openParties', '모집 중 파티', '개', function (ui) { ui.navigate('parties'); }],
    ['lowBalanceStores', '적립금 부족 점포', '곳', function (ui) { ui.navigate('stores'); }],
    ['blockedGuests', '차단된 게스트', '명', function (ui) { ui.navigate('guests', { blocked: true }); }],
  ];

  async function open(content) {
    const ui = UI();
    const h = ui.h;
    content.appendChild(h('h1', { text: '대시보드' }));
    const box = h('div', { id: 'dash' }, h('p', { class: 'state-msg', text: '불러오는 중…' }));
    content.appendChild(box);
    try {
      const s = await api().summary();
      ui.clear(box);
      const grid = h('ul', { class: 'cards stats' });
      CARDS.forEach(function (c) {
        const n = s[c[0]] || 0;
        grid.appendChild(h('li', { class: 'card stat' },
          h('button', { class: 'stat-btn', type: 'button', 'data-stat': c[0], onclick: function () { c[3](ui); } },
            h('span', { class: 'stat-label', text: c[1] }),
            h('strong', { class: 'stat-num', text: String(n) }),
            h('span', { class: 'hint', text: c[2] }))));
      });
      box.appendChild(grid);
      box.appendChild(h('p', { class: 'hint', text: '기준 시각 ' + ui.fmtDate(s.asOf) }));
    } catch (e) {
      ui.clear(box);
      box.appendChild(h('div', { class: 'state-msg' }, h('p', { text: e.message || '불러오지 못했습니다.' }),
        h('button', { class: 'btn', type: 'button', onclick: function () { ui.clear(content); open(content); }, text: '다시 시도' })));
    }
  }

  window.ADMIN_VIEWS = window.ADMIN_VIEWS || {};
  window.ADMIN_VIEWS.dashboard = open;
})();
