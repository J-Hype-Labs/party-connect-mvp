/**
 * OwnerVisit - 점주용 방문 인증 클라이언트 로직 (골격)
 *
 * 이번 범위: 코드 정규화/검증 + 인증 요청 위임까지. 실제 서버(점주 권한 API)가
 * 없으면 어떤 네트워크 요청도 나가지 않는다(ownerApiEnabled=false 기본값).
 *
 * 페이지 코드 디펜던시 규칙:
 * - 사용자가 입력한 값은 textContent/입력 컨트롤로만 다룬다 (innerHTML 금지).
 * - 게스트 코드를 클라이언트에서 생성·추측하지 않는다. 코드 입력은 유저 제출만.
 * - 관리자 /admin/* 경로를 절대 사용하지 않는다. 계약은
 *   POST /owner/applications/:id/verify-visit (docs/OWNER_VISIT_API_CONTRACT.md).
 *
 * 서버 구현이 끝난 뒤 연결 방법 (예시, 실제 서버 주소에 맞춤):
 *
 *   OwnerVisit.configure({
 *     ownerApiEnabled: true,
 *     transport: (req) => window.PARTYLINK_AUTH.api(
 *       'owner/applications/' + encodeURIComponent(req.applicationId) + '/verify-visit',
 *       { method: 'POST', body: { code: req.code } })
 *   });
 *
 * transport 는 테스트에서 주입 가능한 seam 이다.
 */

(function () {
  'use strict';

  // 서버가 내려주는 코드 형식: 'HC-' + 영숫자 6자 (예: HC-7F3K9Q).
  var CODE_PREFIX = 'HC-';
  var CODE_LENGTH = 6;
  var CODE_PATTERN = /^HC-[0-9A-Z]{6}$/;

  var CODE_FORMAT_HINT = '방문 코드 형식이 올바르지 않습니다. 예: HC-7F3K9Q';
  var MISSING_APPLICATION_HINT = '신청 ID가 없어 인증을 시작할 수 없습니다. 내 신청 목록에서 확인해 주세요.';
  var NO_TRANSPORT_HINT = '전송 계층이 연결되지 않았습니다. OwnerVisit.configure 로 연결해 주세요.';
  var DEFAULT_UNAVAILABLE_REASON = '점주 인증 API가 아직 준비되지 않았습니다';
  // 서버 규칙(안내만): 방문 인증은 파티 시작 60분 전부터 종료 시간까지 가능합니다.
  var TIME_WINDOW_HINT = '방문 인증은 파티 시작 60분 전부터 종료 시간까지 가능합니다';

  var state = {
    ownerApiEnabled: false,
    reason: DEFAULT_UNAVAILABLE_REASON,
    transport: null
  };

  function isPlainObject(v) { return v !== null && typeof v === 'object'; }

  /**
   * 입력 코드를 표시/비교 형식으로 정규화한다.
   * - 대문자화, 모든 공백·하이픈 제거.
   * - HypeConnect 접두사(HC)로 시작하면 앞 2글자 뒤에 하이픈을 넣어 'HC-XXXXXX' 표기를 만든다.
   *   접두사가 없는 입력은 그대로 둔다(형식 검증에서 false 로 걸러진다).
   * 값이 없으면 빈 문자열.
   */
  function normalizeCode(value) {
    if (value === null || value === undefined) return '';
    var s = String(value).toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
    if (s.slice(0, 2) === 'HC' && s.length > 2) s = s.slice(0, 2) + '-' + s.slice(2);
    return s;
  }

  /** 정규화된 코드가 서버 계약 형식과 일치하는지 */
  function isValidCodeFormat(value) {
    return CODE_PATTERN.test(normalizeCode(value));
  }

  function isConfig(obj) {
    return obj === undefined || obj === null || typeof obj === 'object';
  }

  function notify() {
    try {
      window.dispatchEvent(new CustomEvent('owner-visit:config'));
    } catch (e) { /* 구형 환경 무시 */ }
  }

  function describe() {
    return {
      ownerApiEnabled: !!state.ownerApiEnabled,
      available: !!state.ownerApiEnabled,
      reason: state.ownerApiEnabled ? null : state.reason
    };
  }

  /** 사용 가능 여부/사유/transport 설정. 서버 준비되면 ownerApiEnabled=true 로 켠다. */
  function configure(opts) {
    if (!isConfig(opts)) return;
    if (typeof opts.ownerApiEnabled === 'boolean') state.ownerApiEnabled = opts.ownerApiEnabled;
    if (typeof opts.reason === 'string') state.reason = opts.reason;
    if (opts.transport === null || typeof opts.transport === 'function') state.transport = opts.transport;
    if (!state.ownerApiEnabled && typeof opts.reason !== 'string') state.reason = DEFAULT_UNAVAILABLE_REASON;
    notify();
  }

  /** availability change 구독 (페이지 재렌더 트리거) */
  function onConfigChange(fn) {
    if (typeof fn !== 'function') return;
    window.addEventListener('owner-visit:config', fn);
  }

  /**
   * 인증 요청 위임. ownerApiEnabled=false 이거나 transport 미연결이면
   * 네트워크 요청 없이 거부한다 (기존 서버 부재 = fail-closed).
   */
  function verifyVisit(applicationId, code) {
    if (!state.ownerApiEnabled) {
      var notReady = new Error(state.reason || DEFAULT_UNAVAILABLE_REASON);
      notReady.code = 'OWNER_API_NOT_READY';
      notReady.status = 0;
      return Promise.reject(notReady);
    }
    if (typeof state.transport !== 'function') {
      var noTransport = new Error(NO_TRANSPORT_HINT);
      noTransport.code = 'NO_TRANSPORT';
      noTransport.status = 0;
      return Promise.reject(noTransport);
    }
    var id = applicationId === null || applicationId === undefined ? '' : String(applicationId).trim();
    var normalized = normalizeCode(code);
    if (!id) {
      var noApp = new Error(MISSING_APPLICATION_HINT);
      noApp.code = 'MISSING_APPLICATION_ID';
      noApp.status = 0;
      return Promise.reject(noApp);
    }
    if (!CODE_PATTERN.test(normalized)) {
      var bad = new Error(CODE_FORMAT_HINT);
      bad.code = 'INVALID_CODE_FORMAT';
      bad.status = 0;
      return Promise.reject(bad);
    }
    return Promise.resolve(state.transport({ applicationId: id, code: normalized }));
  }

  function clearConfig() {
    state.ownerApiEnabled = false;
    state.reason = DEFAULT_UNAVAILABLE_REASON;
    state.transport = null;
    notify();
  }

  window.OwnerVisit = {
    VERSION: 'skeleton-1',
    CODE_PREFIX: CODE_PREFIX,
    CODE_LENGTH: CODE_LENGTH,
    TIME_WINDOW_HINT: TIME_WINDOW_HINT,
    CODE_FORMAT_HINT: CODE_FORMAT_HINT,
    MISSING_APPLICATION_HINT: MISSING_APPLICATION_HINT,
    normalizeCode: normalizeCode,
    isValidCodeFormat: isValidCodeFormat,
    isAvailable: function () { return !!state.ownerApiEnabled; },
    describe: describe,
    configure: configure,
    clearConfig: clearConfig,
    onConfigChange: onConfigChange,
    verifyVisit: verifyVisit
  };
})();
