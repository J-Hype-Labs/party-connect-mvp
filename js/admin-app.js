/**
 * 관리자 페이지 (명세: J-Hype-Labs/partylink docs/admin-page-spec.md)
 * 1차 범위: 로그인 가드(A0) + 내비게이션 + 신청 관리(A3)
 * - 사용자 데이터는 textContent 로만 넣습니다 (innerHTML 금지).
 * - 권한은 서버가 판단합니다. 화면의 숨김은 편의일 뿐입니다.
 */
(function () {
  'use strict';

  const auth = window.PARTYLINK_AUTH;
  const api = window.ADMIN_API;
  const app = document.getElementById('app');
  const toasts = document.getElementById('toasts');

  // ---------------------------------------------------------------- 유틸
  function h(tag, attrs) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      const v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (function add(list) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c === null || c === undefined || c === false) continue;
        if (Array.isArray(c)) add(c);
        else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    })(Array.prototype.slice.call(arguments, 2));
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function toast(message, kind) {
    const t = h('div', { class: 'toast ' + (kind || 'error'), text: message });
    toasts.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 6000);
  }

  const dateFmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  function fmtDate(iso) { return iso ? dateFmt.format(new Date(iso)) : '-'; }
  function won(n) { return (n || 0).toLocaleString('ko-KR') + '원'; }

  const STATUS = {
    APPLIED: ['신청', 'st-applied'], APPROVED: ['선정', 'st-approved'], VISITED: ['방문 인증', 'st-visited'],
    MISSION_SUBMITTED: ['미션 제출', 'st-mission'], COMPLETED: ['완료', 'st-done'], NOSHOW: ['노쇼', 'st-bad'],
    REJECTED: ['반려', 'st-bad'], CANCELLED: ['취소', 'st-muted'],
  };

  // ---------------------------------------------------------------- 화면 상태
  const state = { view: 'loading', user: null, error: '' };

  function show(view, extra) {
    state.view = view;
    Object.assign(state, extra || {});
    render();
  }

  function render() {
    clear(app);
    if (state.view === 'loading') return app.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (state.view === 'notlive') return app.appendChild(card('실서비스 설정이 필요합니다', state.error || '주소 끝에 ?live=1 을 붙여 열어 주세요.'));
    if (state.view === 'login') return app.appendChild(loginView());
    if (state.view === 'forbidden') return app.appendChild(forbiddenView());
    if (state.view === 'error') return app.appendChild(errorView());
    return app.appendChild(shellView());
  }

  function card(title, msg, actions) {
    return h('main', { class: 'gate' },
      h('h1', { text: title }),
      msg ? h('p', { text: msg }) : null,
      actions || null);
  }

  function loginView() {
    return card('관리자 로그인', '관리자 권한이 있는 카카오 계정으로 로그인해 주세요.',
      h('button', { class: 'btn primary', id: 'login-btn', type: 'button', onclick: login, text: '카카오로 로그인' }));
  }

  function forbiddenView() {
    return card('권한이 없습니다', '이 계정은 관리자로 등록되어 있지 않습니다. 관리자 등록은 운영자에게 요청해 주세요.',
      h('button', { class: 'btn', id: 'logout-btn', type: 'button', onclick: logout, text: '다른 계정으로 로그인' }));
  }

  function errorView() {
    return card('연결하지 못했습니다', state.error,
      h('button', { class: 'btn primary', id: 'retry-btn', type: 'button', onclick: boot, text: '다시 시도' }));
  }

  // ---------------------------------------------------------------- 인증
  async function login() {
    const redirectTo = window.location.origin + window.location.pathname + window.location.search;
    const { error } = await auth.client.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: redirectTo } });
    if (error) toast('로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }

  async function logout() {
    try { await auth.client.auth.signOut(); } catch (e) { /* 세션이 이미 없을 수 있음 */ }
    show('login');
  }

  async function boot() {
    if (!auth || !auth.live) return show('notlive');
    show('loading');
    try {
      const sess = await auth.client.auth.getSession();
      if (!sess || !sess.data || !sess.data.session) return show('login');
      const me = await api.me();
      show('app', { user: me });
      navigate('applications');
    } catch (e) {
      if (e.status === 401) return show('login');
      if (e.status === 403) return show('forbidden');
      show('error', { error: e.message || '요청을 처리하지 못했습니다.' });
    }
  }

  window.addEventListener('admin:unauthorized', function () {
    if (state.view === 'app') {
      toast('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      show('login');
    }
  });

  // ---------------------------------------------------------------- 셸 (내비게이션)
  const NAV = [
    ['applications', '신청', true],
    ['dashboard', '대시보드', false],
    ['parties', '파티', true],
    ['stores', '점포·적립금', true],
    ['guests', '게스트', false],
  ];

  let content = null;

  // 화면 전환: 신청은 이 파일, 파티·점포는 js/admin-catalog.js (window.ADMIN_VIEWS)
  function navigate(name) {
    state.section = name;
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
      const on = b.getAttribute('data-nav') === name;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (name === 'applications') return openApplications();
    const open = window.ADMIN_VIEWS && window.ADMIN_VIEWS[name];
    if (open) open(content);
  }

  function shellView() {
    content = h('section', { class: 'content', id: 'content', 'aria-live': 'polite' });
    return h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('strong', { text: '파티커넥트 관리자' }),
        h('button', { class: 'btn small', id: 'logout-btn', type: 'button', onclick: logout, text: '로그아웃' })),
      h('nav', { class: 'nav', 'aria-label': '관리자 메뉴' },
        NAV.map(function (n) {
          return h('button', {
            class: 'nav-item' + (n[0] === 'applications' ? ' active' : ''), type: 'button', 'data-nav': n[0],
            disabled: !n[2], 'aria-current': n[0] === 'applications' ? 'page' : false,
            onclick: function () { navigate(n[0]); },
            text: n[1] + (n[2] ? '' : ' (준비 중)'),
          });
        })),
      content);
  }

  // ---------------------------------------------------------------- 신청 관리 (A3)
  const view = { status: '', slotId: '', parties: [], items: [], busy: {}, loaded: false, failed: '' };

  async function openApplications() {
    view.loaded = false;
    renderApplications();
    try {
      const [parties, items] = await Promise.all([api.parties(), api.applications(filters())]);
      view.parties = parties; view.items = items; view.failed = '';
    } catch (e) {
      view.failed = e.message || '목록을 불러오지 못했습니다.';
    }
    view.loaded = true;
    renderApplications();
  }

  function filters() { return { status: view.status, slotId: view.slotId }; }

  async function reload() {
    try { view.items = await api.applications(filters()); view.failed = ''; }
    catch (e) { view.failed = e.message || '목록을 불러오지 못했습니다.'; }
    view.loaded = true;
    renderApplications();
  }

  function renderApplications() {
    if (!content || state.section !== 'applications') return;
    clear(content);
    content.appendChild(h('h1', { text: '신청 관리' }));

    const statusSel = h('select', { id: 'filter-status', 'aria-label': '상태 필터', onchange: function (e) { view.status = e.target.value; view.loaded = false; renderApplications(); reload(); } },
      h('option', { value: '', text: '전체 상태' }),
      Object.keys(STATUS).map(function (k) { return h('option', { value: k, text: STATUS[k][0], selected: view.status === k }); }));
    const partySel = h('select', { id: 'filter-party', 'aria-label': '파티 필터', onchange: function (e) { view.slotId = e.target.value; view.loaded = false; renderApplications(); reload(); } },
      h('option', { value: '', text: '전체 파티' }),
      view.parties.map(function (p) { return h('option', { value: p.id, text: p.title + ' · ' + fmtDate(p.startsAt), selected: view.slotId === p.id }); }));
    content.appendChild(h('div', { class: 'filters' }, statusSel, partySel,
      h('button', { class: 'btn small', id: 'refresh-btn', type: 'button', onclick: function () { view.loaded = false; renderApplications(); reload(); }, text: '새로고침' })));

    if (!view.loaded) return content.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (view.failed) {
      return content.appendChild(h('div', { class: 'state-msg' }, h('p', { text: view.failed }),
        h('button', { class: 'btn', type: 'button', onclick: openApplications, text: '다시 시도' })));
    }
    if (view.items.length === 0) return content.appendChild(h('p', { class: 'state-msg', id: 'empty', text: '조건에 맞는 신청이 없습니다.' }));

    const list = h('ul', { class: 'cards', id: 'app-list' });
    view.items.forEach(function (a) { list.appendChild(appCard(a)); });
    content.appendChild(list);
  }

  function appCard(a) {
    const st = STATUS[a.status] || [a.status, 'st-muted'];
    const g = a.guest || {};
    const busy = !!view.busy[a.id];
    const actions = [];
    const btn = function (label, cls, fn, id) {
      return h('button', { class: 'btn small ' + cls, type: 'button', disabled: busy, 'data-action': id, onclick: fn, text: label });
    };
    if (a.status === 'APPLIED') {
      actions.push(btn('선정', 'primary', function () { run(a, 'approve', function () { return api.approve(a.id); }, '선정했습니다.'); }, 'approve'));
      actions.push(btn('반려', '', function () { rejectDialog(a); }, 'reject'));
    }
    if (a.status === 'APPROVED') {
      actions.push(btn('방문 인증', 'primary', function () { visitDialog(a); }, 'verify-visit'));
      actions.push(btn('노쇼', 'danger', function () { noshowDialog(a); }, 'noshow'));
    }
    if (a.status === 'MISSION_SUBMITTED') {
      actions.push(btn('최종 승인', 'primary', function () { completeDialog(a); }, 'complete'));
      actions.push(btn('보완 요청', '', function () { revisionDialog(a); }, 'request-revision'));
    }

    return h('li', { class: 'card', 'data-app-id': a.id },
      h('div', { class: 'card-head' },
        h('strong', { text: g.name || '(이름 없음)' }),
        h('span', { class: 'badge ' + st[1], text: st[0] })),
      h('dl', { class: 'meta' },
        row('연락처', g.phone || '-'),
        row('파티', (a.partyTitle || '-') + ' · ' + fmtDate(a.partyStartsAt)),
        row('점포', a.storeName || '-'),
        row('신청', fmtDate(a.appliedAt)),
        a.visitCode ? row('방문 코드', a.visitCode) : null,
        a.missionUrl ? h('div', null, h('dt', { text: '미션' }), h('dd', null, safeLink(a.missionUrl))) : null,
        a.feeAmount ? row('수수료', won(a.feeAmount)) : null,
        a.rejectReason ? row('반려 사유', a.rejectReason) : null,
        g.isBlocked ? row('계정', '차단됨') : null,
        g.noshowCount ? row('노쇼 이력', g.noshowCount + '회') : null),
      actions.length ? h('div', { class: 'actions' }, actions) : null);
  }

  function row(k, v) { return h('div', null, h('dt', { text: k }), h('dd', { text: v })); }

  // 사용자가 입력한 URL 은 http(s) 만 링크로 만든다
  function safeLink(url) {
    if (!/^https?:\/\//i.test(url)) return document.createTextNode(url);
    return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: url });
  }

  // 요청 실행: 중복 제출 방지 + 서버 메시지 그대로 표시
  async function run(a, name, fn, okMsg) {
    if (view.busy[a.id]) return false;
    view.busy[a.id] = true;
    renderApplications();
    let ok = false;
    try {
      await fn();
      toast(okMsg, 'ok');
      ok = true;
    } catch (e) {
      toast(e.message || '요청을 처리하지 못했습니다.');
    }
    delete view.busy[a.id];
    await reload();
    return ok;
  }

  // ---------------------------------------------------------------- 확인 대화상자 (<dialog>)
  function dialog(title, bodyNodes, confirmLabel, danger, onConfirm) {
    const dlg = h('dialog', { class: 'dlg', 'aria-labelledby': 'dlg-title' });
    const err = h('p', { class: 'dlg-err', role: 'alert' });
    const confirm = h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), type: 'submit', id: 'dlg-confirm', text: confirmLabel });
    const cancel = h('button', { class: 'btn', type: 'button', id: 'dlg-cancel', text: '취소', onclick: function () { dlg.close(); } });
    const form = h('form', { method: 'dialog', onsubmit: async function (ev) {
      ev.preventDefault();
      confirm.disabled = true;
      const msg = await onConfirm(dlg);
      if (msg) { err.textContent = msg; confirm.disabled = false; } else { dlg.close(); }
    } }, h('h2', { id: 'dlg-title', text: title }), bodyNodes, err, h('div', { class: 'actions' }, cancel, confirm));
    dlg.appendChild(form);
    dlg.addEventListener('close', function () { if (dlg.parentNode) dlg.parentNode.removeChild(dlg); });
    document.body.appendChild(dlg);
    dlg.showModal();
    return dlg;
  }

  function rejectDialog(a) {
    const ta = h('textarea', { id: 'reject-reason', maxlength: '500', rows: '3', 'aria-label': '반려 사유(선택)', placeholder: '반려 사유 (선택, 500자)' });
    dialog('신청을 반려할까요?', h('div', null, h('p', { text: (a.guest && a.guest.name || '') + ' 님의 신청을 반려합니다.' }), ta), '반려', true, async function () {
      const ok = await run(a, 'reject', function () { return api.reject(a.id, ta.value.trim()); }, '반려했습니다.');
      return ok ? '' : '반려하지 못했습니다. 위 알림의 안내를 확인해 주세요.';
    });
  }

  function visitDialog(a) {
    const input = h('input', { id: 'visit-code', type: 'text', autocomplete: 'off', 'aria-label': '방문 코드', placeholder: '게스트가 보여 준 방문 코드', required: true, maxlength: '32' });
    dialog('방문 인증', h('div', null, h('p', { text: '게스트가 매장에서 보여 준 코드를 입력하세요. 파티 시간대에만 인증됩니다.' }), input), '인증', false, async function () {
      const code = input.value.trim();
      if (!code) return '방문 코드를 입력해 주세요.';
      const ok = await run(a, 'verify', function () { return api.verifyVisit(a.id, code); }, '방문을 인증했습니다.');
      return ok ? '' : '인증하지 못했습니다. 코드와 시간을 확인해 주세요.';
    });
    input.focus();
  }

  function noshowDialog(a) {
    dialog('노쇼로 처리할까요?', h('p', { text: (a.guest && a.guest.name || '') + ' 님을 노쇼로 기록합니다. 벌점이 쌓이고 누적되면 신청이 자동 제한될 수 있습니다.' }), '노쇼 처리', true, async function () {
      const ok = await run(a, 'noshow', function () { return api.noshow(a.id); }, '노쇼로 처리했습니다.');
      return ok ? '' : '처리하지 못했습니다. 위 알림의 안내를 확인해 주세요.';
    });
  }

  function revisionDialog(a) {
    dialog('미션 보완을 요청할까요?', h('p', { text: (a.guest && a.guest.name || '') + ' 님의 신청이 "방문 인증" 상태로 돌아가 같은 신청에 미션 링크를 다시 제출할 수 있습니다. 적립금은 차감되지 않습니다.' }), '보완 요청', false, async function () {
      const ok = await run(a, 'request-revision', function () { return api.requestRevision(a.id); }, '보완을 요청했습니다.');
      return ok ? '' : '요청하지 못했습니다. 위 알림의 안내를 확인해 주세요.';
    });
  }

  function completeDialog(a) {
    dialog('최종 승인', h('div', null,
      h('p', { text: '승인하면 ' + (a.storeName || '점포') + '의 적립금에서 ' + won(a.feeAmount) + '이(가) 차감됩니다.' }),
      h('p', { class: 'hint', text: '적립금 원장은 수정할 수 없어 되돌릴 수 없습니다.' })), '승인하고 차감', false, async function () {
      const ok = await run(a, 'complete', function () { return api.complete(a.id); }, '승인했습니다.');
      return ok ? '' : '승인하지 못했습니다. 위 알림의 안내를 확인해 주세요.';
    });
  }

  window.ADMIN_UI = { h: h, clear: clear, toast: toast, fmtDate: fmtDate, won: won, dialog: dialog, isActive: function (name) { return state.section === name; } };

  boot();
})();
