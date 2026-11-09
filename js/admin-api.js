/**
 * 관리자 API 클라이언트
 * - 메인 사이트의 window.PARTYLINK_AUTH.api (js/auth-client.js)를 읽기 전용으로 감쌉니다.
 * - 권한 판단은 서버가 합니다. 여기서는 401(로그인 필요)만 앱에 알립니다.
 */
(function () {
  'use strict';

  const auth = window.PARTYLINK_AUTH;

  async function request(path, opts) {
    if (!auth || !auth.live) {
      const err = new Error('실서비스 모드가 아닙니다. 주소 끝에 ?live=1 을 붙여 열어 주세요.');
      err.status = 0;
      err.code = 'NOT_LIVE';
      throw err;
    }
    try {
      return await auth.api(path, opts);
    } catch (e) {
      if (e && e.status === 401) window.dispatchEvent(new CustomEvent('admin:unauthorized'));
      throw e;
    }
  }

  function query(params) {
    const q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') q.set(k, params[k]);
    });
    const s = q.toString();
    return s ? '?' + s : '';
  }

  window.ADMIN_API = {
    me: function () { return request('admin/me'); },
    parties: function (params) { return request('admin/parties' + query(Object.assign({ limit: 200 }, params))); },
    applications: function (params) { return request('admin/applications' + query(Object.assign({ limit: 200 }, params))); },
    approve: function (id) { return request('admin/applications/' + id + '/approve', { method: 'POST' }); },
    reject: function (id, reason) { return request('admin/applications/' + id + '/reject', { method: 'POST', body: { reason: reason || undefined } }); },
    complete: function (id) { return request('admin/applications/' + id + '/complete', { method: 'POST' }); },
    noshow: function (id) { return request('admin/applications/' + id + '/noshow', { method: 'POST' }); },
    summary: function () { return request('admin/summary'); },
    createParty: function (body) { return request('admin/parties', { method: 'POST', body: body }); },
    updateParty: function (id, body) { return request('admin/parties/' + id, { method: 'PATCH', body: body }); },
    stores: function () { return request('admin/stores?limit=200'); },
    createStore: function (body) { return request('admin/stores', { method: 'POST', body: body }); },
    updateStore: function (id, body) { return request('admin/stores/' + id, { method: 'PATCH', body: body }); },
    deposits: function (id) { return request('admin/stores/' + id + '/deposits?limit=100'); },
    charge: function (id, body) { return request('admin/stores/' + id + '/charge', { method: 'POST', body: body }); },
    refund: function (id, body) { return request('admin/stores/' + id + '/refund', { method: 'POST', body: body }); },
    guests: function (params) { return request('admin/guests' + query(Object.assign({ limit: 200 }, params))); },
    blockGuest: function (id, blocked) { return request('admin/guests/' + id + '/block', { method: 'POST', body: { blocked: blocked } }); },
    verifyVisit: function (id, code) { return request('admin/applications/' + id + '/verify-visit', { method: 'POST', body: { code: code } }); },
  };
})();
