/**
 * 파티 관리 (A2) — 목록(상태 필터) / 등록·수정 / 상태 변경.
 * 데모 폼을 복사하지 않고 DB 모델(party_slots: 일시·정원·모집 마감·수수료) 기준입니다.
 * 파티 삭제는 없고 '취소'(CANCELLED)로 대체합니다.
 */
(function () {
  'use strict';
  const ui = () => window.ADMIN_UI;

  const STATUS = { DRAFT: ['임시저장', 'st-muted'], OPEN: ['모집 중', 'st-approved'], CLOSED: ['모집 마감', 'st-visited'], CANCELLED: ['취소', 'st-bad'], FINISHED: ['종료', 'st-done'] };
  // 현재 상태 → 가능한 상태 변경 버튼 [라벨, 다음 상태, 위험 여부]
  const MOVES = {
    DRAFT: [['공개', 'OPEN', false], ['취소', 'CANCELLED', true]],
    OPEN: [['모집 마감', 'CLOSED', false], ['취소', 'CANCELLED', true]],
    CLOSED: [['종료', 'FINISHED', false], ['취소', 'CANCELLED', true]],
  };
  const CATEGORIES = ['혼술바', '소개팅', '소셜파티'];

  const kst = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  // ISO → <input type="datetime-local"> 값 (KST)
  function toInput(iso) { return iso ? kst.format(new Date(iso)).replace(' ', 'T') : ''; }
  // 입력값(KST) → ISO
  function fromInput(v) { const d = new Date(v + ':00+09:00'); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }

  const S = { status: '', items: [], failed: '', loaded: false, content: null, stores: null };

  async function open(content, opts) {
    S.content = content;
    if (opts && opts.status !== undefined) S.status = opts.status;
    await load();
  }

  async function load() {
    S.loaded = false; render();
    try { S.items = await ui().api.parties(S.status ? { status: S.status } : {}); S.failed = ''; }
    catch (e) { S.failed = e.message || '목록을 불러오지 못했습니다.'; }
    S.loaded = true; render();
  }

  function render() {
    const u = ui(), h = u.h, c = S.content;
    u.clear(c);
    c.appendChild(h('h1', { text: '파티 관리' }));
    c.appendChild(h('div', { class: 'toolbar' },
      h('select', { id: 'party-status', 'aria-label': '상태 필터', onchange: function (e) { S.status = e.target.value; load(); } },
        h('option', { value: '', text: '전체 상태' }),
        Object.keys(STATUS).map(function (k) { return h('option', { value: k, text: STATUS[k][0], selected: S.status === k }); })),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn primary', id: 'party-new', type: 'button', onclick: function () { form(null); }, text: '파티 등록' })));
    if (!S.loaded) return c.appendChild(h('p', { class: 'state-msg', text: '불러오는 중…' }));
    if (S.failed) return c.appendChild(h('div', { class: 'state-msg' }, h('p', { text: S.failed }), h('button', { class: 'btn', type: 'button', onclick: load, text: '다시 시도' })));
    if (!S.items.length) return c.appendChild(h('p', { class: 'state-msg', id: 'empty', text: '등록된 파티가 없습니다.' }));
    const list = h('ul', { class: 'cards', id: 'party-list' });
    S.items.forEach(function (p) { list.appendChild(card(p)); });
    c.appendChild(list);
  }

  function card(p) {
    const u = ui(), h = u.h;
    const st = STATUS[p.status] || [p.status, 'st-muted'];
    const moves = (MOVES[p.status] || []).map(function (m) {
      return h('button', { class: 'btn small ' + (m[2] ? 'danger' : ''), type: 'button', 'data-move': m[1], onclick: function () { move(p, m); }, text: m[0] });
    });
    const editable = p.status !== 'CANCELLED' && p.status !== 'FINISHED';
    return h('li', { class: 'card', 'data-party-id': p.id },
      h('div', { class: 'card-head' }, h('strong', { text: p.title }), h('span', { class: 'badge ' + st[1], text: st[0] })),
      h('dl', { class: 'meta' },
        u.row('점포', (p.storeName || '-') + (p.region ? ' · ' + p.region : '')),
        u.row('일시', u.fmtDate(p.startsAt) + ' ~ ' + u.fmtDate(p.endsAt)),
        u.row('모집 마감', u.fmtDate(p.recruitDeadline)),
        u.row('인원', p.selectedCount + ' / ' + p.capacity + '명 선정 · 신청 ' + p.applicantCount + '명'),
        u.row('수수료', u.won(p.feePerGuest) + ' / 인'),
        p.isFeatured ? u.row('노출', '추천') : null),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small', type: 'button', 'data-action': 'applications', onclick: function () { u.goto('applications', { slotId: p.id, status: '' }); }, text: '신청 보기' }),
        editable ? h('button', { class: 'btn small', type: 'button', 'data-action': 'edit', onclick: function () { form(p); }, text: '수정' }) : null,
        moves));
  }

  function move(p, m) {
    const u = ui(), h = u.h;
    const text = m[1] === 'CANCELLED'
      ? '"' + p.title + '" 파티를 취소합니다. 모집이 중단되고 되돌릴 수 없습니다.'
      : '"' + p.title + '" 파티를 "' + m[0] + '" 상태로 바꿉니다.';
    u.dialog(m[0] + '할까요?', h('p', { text: text }), m[0], m[2], async function () {
      try { await u.api.updateParty(p.id, { status: m[1] }); u.toast('변경했습니다.', 'ok'); await load(); return ''; }
      catch (e) { return e.message || '변경하지 못했습니다.'; }
    });
  }

  async function form(p) {
    const u = ui(), h = u.h;
    if (!p && !S.stores) {
      try { S.stores = await u.api.stores(); } catch (e) { return u.toast(e.message || '점포 목록을 불러오지 못했습니다.'); }
    }
    const activeStores = (S.stores || []).filter(function (s) { return s.isActive; });
    if (!p && !activeStores.length) return u.toast('먼저 점포를 등록해 주세요. (점포·적립금 메뉴)');

    const f = {
      store: p ? h('input', { value: p.storeName, disabled: true, 'aria-label': '점포' })
               : h('select', { id: 'pf-store', required: true }, activeStores.map(function (s) { return h('option', { value: s.id, text: s.name + (s.region ? ' · ' + s.region : '') }); })),
      title: h('input', { id: 'pf-title', required: true, maxlength: '100', value: p ? p.title : '' }),
      benefit: h('input', { id: 'pf-benefit', required: true, maxlength: '500', value: p ? p.benefit : '' }),
      description: h('textarea', { id: 'pf-desc', rows: '3', maxlength: '2000' }),
      category: h('select', { id: 'pf-category' }, h('option', { value: '', text: '선택 안 함' }),
        CATEGORIES.map(function (k) { return h('option', { value: k, text: k, selected: !!p && p.category === k }); })),
      startsAt: h('input', { id: 'pf-start', type: 'datetime-local', required: true, value: p ? toInput(p.startsAt) : '' }),
      endsAt: h('input', { id: 'pf-end', type: 'datetime-local', required: true, value: p ? toInput(p.endsAt) : '' }),
      deadline: h('input', { id: 'pf-deadline', type: 'datetime-local', required: true, value: p ? toInput(p.recruitDeadline) : '' }),
      capacity: h('input', { id: 'pf-capacity', type: 'number', min: '1', max: '1000', step: '1', required: true, value: p ? String(p.capacity) : '' }),
      fee: h('input', { id: 'pf-fee', type: 'number', min: '0', step: '100', placeholder: '비우면 점포 기본 수수료', value: p ? String(p.feePerGuest) : '' }),
      status: p ? null : h('select', { id: 'pf-status' }, h('option', { value: 'DRAFT', text: '임시저장 (비공개)' }), h('option', { value: 'OPEN', text: '바로 모집 시작' })),
      featured: h('input', { id: 'pf-featured', type: 'checkbox', checked: p ? p.isFeatured : false }),
      badges: h('input', { id: 'pf-badges', placeholder: '쉼표로 구분 (예: NEW, 이벤트)', value: p ? (p.badges || []).join(', ') : '' }),
      images: h('textarea', { id: 'pf-images', rows: '2', placeholder: '이미지 주소, 한 줄에 하나 (https://…)' }),
    };
    if (p) { f.description.value = p.description || ''; f.images.value = (p.images || []).join('\n'); }

    const body = h('div', { class: 'form-grid' },
      u.field('점포', f.store), u.field('카테고리', f.category),
      u.field('제목', f.title), u.field('혜택', f.benefit),
      u.field('시작 (한국 시간)', f.startsAt), u.field('종료 (한국 시간)', f.endsAt),
      u.field('모집 마감 (한국 시간)', f.deadline), u.field('정원 (명)', f.capacity),
      u.field('인당 수수료 (원)', f.fee), f.status ? u.field('공개 상태', f.status) : null,
      u.field('배지', f.badges), h('label', { class: 'field inline' }, f.featured, h('span', { text: '추천 파티로 노출' })),
      u.field('설명', f.description), u.field('이미지', f.images));

    const dlg = u.dialog(p ? '파티 수정' : '파티 등록', body, p ? '저장' : '등록', false, async function () {
      const startsAt = fromInput(f.startsAt.value), endsAt = fromInput(f.endsAt.value), recruitDeadline = fromInput(f.deadline.value);
      if (!f.title.value.trim()) return '제목을 입력해 주세요.';
      if (!f.benefit.value.trim()) return '혜택을 입력해 주세요.';
      if (!startsAt || !endsAt || !recruitDeadline) return '시작·종료·모집 마감 일시를 모두 입력해 주세요.';
      if (new Date(endsAt) <= new Date(startsAt)) return '종료는 시작보다 늦어야 합니다.';
      if (new Date(recruitDeadline) > new Date(startsAt)) return '모집 마감은 시작 이전이어야 합니다.';
      const capacity = Number(f.capacity.value);
      if (!Number.isInteger(capacity) || capacity < 1) return '정원은 1명 이상의 정수여야 합니다.';
      const payload = {
        title: f.title.value.trim(), benefit: f.benefit.value.trim(), description: f.description.value.trim(),
        category: f.category.value || null, startsAt: startsAt, endsAt: endsAt, recruitDeadline: recruitDeadline, capacity: capacity,
        isFeatured: f.featured.checked,
        badges: f.badges.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean),
        images: f.images.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean),
      };
      if (f.fee.value !== '') payload.feePerGuest = Number(f.fee.value);
      if (payload.images.some(function (x) { return !/^https?:\/\//i.test(x); })) return '이미지 주소는 http(s):// 로 시작해야 합니다.';
      try {
        if (p) await u.api.updateParty(p.id, payload);
        else await u.api.createParty(Object.assign({ storeId: f.store.value, status: f.status.value }, payload));
        u.toast(p ? '저장했습니다.' : '파티를 등록했습니다.', 'ok');
        await load();
        return '';
      } catch (e) { return e.message || '저장하지 못했습니다.'; }
    });
    dlg.classList.add('wide');
    (p ? f.title : f.store).focus();
  }

  window.ADMIN_SCREENS = window.ADMIN_SCREENS || {};
  window.ADMIN_SCREENS.parties = { open: open };
})();
