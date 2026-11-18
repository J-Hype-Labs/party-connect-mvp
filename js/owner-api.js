/**
 * 점주(owner) API 클라이언트 — "계약 고정"용 골격.
 *
 * - window.PARTYLINK_CONFIG.ownerApiEnabled === true 인 배포에서만 실 요청을 보낸다.
 *   기본값(비활성)에서는 어떤 함수도 네트워크 요청을 일으키지 않고 즉시
 *   `{ available: false }` 를 반환한다(fail-closed). config 가 없거나 값이 true 가
 *   아니면 조용히 비활성이다 — 서버 유무를 클라이언트가 추측하지 않는다.
 * - 활성 시에도 요청 자체는 기존 공용 인증 클라이언트
 *   (window.PARTYLINK_AUTH.api, js/auth-client.js)를 읽기 전용으로 재사용한다
 *   (anon 키 + 사용자 세션). 이 파일은 키·엔드포인트 베이스를 새로 만들지 않으며,
 *   service_role/secret 키를 쓰지 않는다(사용 금지).
 * - 401 이면 admin-api.js 관례대로 이벤트를 띄운다: `owner:unauthorized`.
 * - 사용 가능 시 서버 응답 JSON 을 그대로 돌려준다. 엔드포인트·스키마·에러 코드
 *   단일 출처: docs/OWNER_API_CONTRACT.md (서버 담당자 검토용 초안).
 *
 * ⚠️ 서버 구현이 없는 동안 기본값은 비활성이며, 활성 경로의 응답 모양은 아직
 * 검증되지 않았다(문서상 계약일 뿐). 실제 점주 권한 판정은 서버만 한다.
 */
(function () {
  'use strict';

  const CONFIG = window.PARTYLINK_CONFIG || {};
  // 명시적 true 일 때만 활성. 문자열/1 등은 켜지 않는다.
  const ownerApiEnabled = CONFIG.ownerApiEnabled === true;
  const auth = window.PARTYLINK_AUTH || null;

  // 비활성: 즉시 반환하고 어떤 것도 요청하지 않는다.
  function unavailable() {
    return { available: false };
  }

  function noAuthError() {
    const err = new Error('실서비스 모드가 아닙니다. 주소 끝에 ?live=1 을 붙여 열어 주세요.');
    err.status = 0;
    err.code = 'NOT_LIVE';
    return err;
  }

  async function request(method, path, body) {
    if (!ownerApiEnabled) return unavailable();
    if (!auth || !auth.live || typeof auth.api !== 'function') throw noAuthError();
    try {
      return await auth.api(path, { method: method, body: body });
    } catch (e) {
      if (e && e.status === 401) {
        window.dispatchEvent(new CustomEvent('owner:unauthorized'));
      }
      throw e;
    }
  }

  function withPartyId(partyId) {
    if (partyId === undefined || partyId === null || partyId === '') return '';
    return '?partyId=' + encodeURIComponent(String(partyId));
  }

  window.OwnerApi = {
    /** GET /owner/me — 로그인한 계정이 점주인지 (권한 판정은 서버). */
    me: function () {
      return request('GET', 'owner/me');
    },
    /** GET /owner/parties — 내 점포의 파티만 (서버가 소유권으로 필터). */
    parties: function () {
      return request('GET', 'owner/parties');
    },
    /** GET /owner/applications?partyId=... — 해당 파티의 신청자. */
    applications: function (partyId) {
      return request('GET', 'owner/applications' + withPartyId(partyId));
    },
    /** POST /owner/applications/:id/verify-visit — 방문 인증, body { code }. */
    verifyVisit: function (appId, code) {
      return request(
        'POST',
        'owner/applications/' + encodeURIComponent(String(appId)) + '/verify-visit',
        code === undefined ? undefined : { code: code }
      );
    }
  };
})();
