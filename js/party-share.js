/**
 * HypeConnect Party Share Utility
 *
 * 계약: window.PartyShare 전역 객체 노출
 * - getPartyIdFromSearch(search): URLSearchParams로 '?party=<id>' 파싱, decodeURIComponent 적용, trim
 * - buildShareUrl(party, origin, pathname): 깔끔한 공유 URL 생성 (중복 슬래시 방지, encodeURIComponent)
 * - isShareable(party): party 존재 && !party.isExample 이면 true
 * - copyText(text): Promise<boolean>, navigator.clipboard.writeText 우선, 실패 시 execCommand 폴백
 *
 * IIFE + 'use strict', window 전역 노출, JSX 없는 순수 브라우저 JS
 */

(function () {
  'use strict';

  /**
   * URL 검색 문자열에서 party 파라미터 추출
   * @param {string} search - location.search 형태의 문자열 (예: '?party=abc%201')
   * @returns {string|null} 디코딩된 party id 문자열, 없거나 빈 값이면 null
   */
  function getPartyIdFromSearch(search) {
    if (!search || typeof search !== 'string') return null;

    var params = new URLSearchParams(search);
    var partyParam = params.get('party');

    if (partyParam === null || partyParam === '') return null;

    try {
      var decoded = decodeURIComponent(partyParam);
      var trimmed = decoded.trim();
      return trimmed === '' ? null : trimmed;
    } catch (e) {
      // 디코딩 실패 시 원본 trim 후 반환 (빈 문자열이면 null)
      var trimmed = partyParam.trim();
      return trimmed === '' ? null : trimmed;
    }
  }

  /**
   * 공유 URL 생성
   * @param {Object} party - 파티 객체 (id 속성 필수)
   * @param {string} origin - origin (예: 'https://j-hype-labs.github.io')
   * @param {string} pathname - 경로명 (예: '/party-connect-mvp/' 또는 '/party-connect/')
   * @returns {string} 완성된 공유 URL
   */
  function buildShareUrl(party, origin, pathname) {
    var partyId = String(party && party.id ? party.id : '');
    var encodedId = encodeURIComponent(partyId);

    // origin 정규화: 끝 슬래시 제거
    var cleanOrigin = String(origin || '').replace(/\/+$/, '');

    // pathname 정규화: 앞 슬래시 보장, 끝 슬래시 하나로 통일
    var cleanPathname = String(pathname || '');
    if (cleanPathname !== '' && cleanPathname.charAt(0) !== '/') {
      cleanPathname = '/' + cleanPathname;
    }
    cleanPathname = cleanPathname.replace(/\/+$/, '') + '/';

    return cleanOrigin + cleanPathname + '?party=' + encodedId;
  }

  /**
   * 파티가 공유 가능한지 확인
   * @param {Object|null} party - 파티 객체
   * @returns {boolean} party 존재 && !party.isExample
   */
  function isShareable(party) {
    return !!party && party.isExample !== true;
  }

  /**
   * 텍스트를 클립보드에 복사
   * @param {string} text - 복사할 텍스트
   * @returns {Promise<boolean>} 성공 시 true, 실패 시 false
   */
  function copyText(text) {
    // navigator.clipboard API 사용 가능한지 확인 (보안 컨텍스트 필요)
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      // isSecureContext 체크 (일부 브라우저에서 clipboard API 제한)
      if (window.isSecureContext === false) {
        // 비보안 컨텍스트면 바로 폴백으로
      } else {
        return navigator.clipboard.writeText(text)
          .then(function () {
            return true;
          })
          .catch(function () {
            // 실패 시 폴백으로 계속 진행
            return fallbackCopy(text);
          });
      }
    }

    // 폴백: textarea + execCommand
    return Promise.resolve(fallbackCopy(text));
  }

  /**
   * 폴백 복사 구현 (textarea + execCommand)
   * @param {string} text
   * @returns {boolean}
   */
  function fallbackCopy(text) {
    var textarea = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = text;
      // 화면 밖에 배치
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);

      textarea.select();
      textarea.setSelectionRange(0, text.length); // 모바일 대응

      var successful = document.execCommand('copy');
      return successful;
    } catch (e) {
      return false;
    } finally {
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    }
  }

  // 전역 노출
  window.PartyShare = {
    getPartyIdFromSearch: getPartyIdFromSearch,
    buildShareUrl: buildShareUrl,
    isShareable: isShareable,
    copyText: copyText
  };
})();
