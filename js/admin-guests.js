/**
 * 게스트 (A5) — 목록, 노쇼·벌점 확인, 수동 차단/해제.
 * 벌점 누적 자동 차단(blockedUntil)은 기간이 지나면 풀리며, 해제 버튼은 수동·자동 차단을 모두 풉니다.
 */
(function () {
  'use strict';
  const ui = () => window.ADMIN_UI;
  const api = () => window.ADMIN_API;
  const row = (k, v) => ui().h('div', null, ui().h('dt', { text: k }), ui().h('dd', { text: v }));
  const S = { items: [], failed: '', loaded: false, content: null, blocked: false };

  async function open(content, opts) {
    S.content = content;
    S.blocked = !!(opts && opts.blocked);
    await load();
  }

  async function load() {
    S.loaded = false; render();
    try { S.items = await api().guests(S.blocked ? { blocked: 1 } : {}); S.failed = ''; }
    catch (e) { S.failed = e.message || '목록을 불러오지 못했습니다.'; }
    S.loaded = true; render();
  }

  function isBlocked(g) { return g.isBlocked || (g.blockedUntil && new Date(g.blockedUntil) > new Date()); }

  function render() {
    const u = ui(), h = u.h, c = S.content;
    u.clear(c);
    c.appendChild(h('h1', { text: '게스트' }));
    c.appendChild(h('div', { class: 'toolbar' },
      h('label', { class: 'field check' },
        h('input', { id: 'guest-blocked', type: 'checkbox', checked: S.blocked, onchange: function (e) { S.blocked = e.target.checked; load(); } }),
        h('span', { text: '차단된 게스트만' }))));
    if (!S.loaded) return c.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (S.failed) return c.appendChild(h('div', { class: 'state-msg' }, h('p', { text: S.failed }), h('button', { class: 'btn', type: 'button', onclick: load, text: '다시 시도' })));
    if (!S.items.length) return c.appendChild(h('p', { class: 'state-msg', id: 'empty', text: '조건에 맞는 게스트가 없습니다.' }));
    const list = h('ul', { class: 'cards', id: 'guest-list' });
    S.items.forEach(function (g) { list.appendChild(card(g)); });
    c.appendChild(list);
  }

  function card(g) {
    const u = ui(), h = u.h;
    const blocked = isBlocked(g);
    return h('li', { class: 'card', 'data-guest-id': g.id },
      h('div', { class: 'card-head' }, h('strong', { text: g.name }),
        h('span', { class: 'badge ' + (blocked ? 'st-bad' : 'st-done'), text: blocked ? '차단' : '정상' })),
      h('dl', { class: 'meta' },
        row('연락처', g.phone),
        g.instagram ? row('인스타', g.instagram) : null,
        row('노쇼 / 벌점', g.noshowCount + '회 / ' + g.penaltyCount + '점'),
        g.isBlocked ? row('차단', '관리자 차단 (수동 해제 전까지 유지)') : null,
        !g.isBlocked && blocked ? row('차단', u.fmtDate(g.blockedUntil) + ' 까지 (벌점 자동)') : null),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small ' + (blocked ? 'primary' : 'danger'), type: 'button', 'data-action': blocked ? 'unblock' : 'block',
          onclick: function () { toggle(g, !blocked); }, text: blocked ? '차단 해제' : '차단' })));
  }

  function toggle(g, block) {
    const u = ui(), h = u.h;
    u.dialog(block ? '게스트를 차단할까요?' : '차단을 해제할까요?',
      h('p', { text: block ? g.name + ' 님은 해제하기 전까지 파티에 신청할 수 없습니다.' : g.name + ' 님의 차단(벌점 자동 차단 포함)을 해제합니다.' }),
      block ? '차단' : '해제', block, async function () {
        try { await api().blockGuest(g.id, block); u.toast(block ? '차단했습니다.' : '해제했습니다.', 'ok'); await load(); return ''; }
        catch (e) { return e.message || '처리하지 못했습니다.'; }
      });
  }

  window.ADMIN_VIEWS = window.ADMIN_VIEWS || {};
  window.ADMIN_VIEWS.guests = open;
})();
