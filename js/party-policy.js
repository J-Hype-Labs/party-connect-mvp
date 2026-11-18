/**
 * PartyPolicy — P1 정책 문구(2026-11-18 자동 확정 예시 답변)를 화면과 관리자에 공유한다.
 * Q-08 선정 기준 공개, Q-16 노쇼 30일 안내, Q-21 미션 검수 체크리스트.
 * 서버 변경이 없는 안내 문구만 담당하며, 실제 차단·검수 규칙은 서버가 수행한다.
 * 계약: window.PartyPolicy의 상수(SELECTION_CRITERIA·NOSHOW_NOTICE·REVIEW_CHECKLIST·REVISION_LIMIT)
 */
(function () {
  "use strict";

  // Q-08: 운영자가 판단하되 순서를 정해 둔다. 기준 요약은 파티 상세에 공개한다.
  var SELECTION_CRITERIA = [
    "차단·노쇼 이력이 없는 분을 먼저 봅니다.",
    "미션을 낼 수 있는 SNS 계정이 있는 분을 우선합니다(점주 요청 시).",
    "그다음은 신청이 빠른 순입니다."
  ];

  // Q-16: 신청 화면과 선정 안내 문구에 노쇼 제한을 명시한다.
  var NOSHOW_NOTICE = "선정 후 불참(노쇼) 시 벌점이 쌓이고, 누적되면 30일간 신청이 제한됩니다.";

  // Q-21: 관리자 최종 승인 시 확인할 체크리스트(최대 2회 보완 후 반려).
  var REVIEW_CHECKLIST = [
    "링크가 열리는가",
    "해당 매장을 방문한 후기인가",
    "점주가 요청한 사진 수·해시태그를 채웠는가",
    "협찬 표시('체험단으로 혜택을 제공받아 작성')가 포함됐는가"
  ];

  var REVISION_LIMIT = "보완 요청은 최대 2회까지이며, 그래도 기준을 못 채우면 반려합니다.";

  window.PartyPolicy = {
    SELECTION_CRITERIA: SELECTION_CRITERIA,
    NOSHOW_NOTICE: NOSHOW_NOTICE,
    REVIEW_CHECKLIST: REVIEW_CHECKLIST,
    REVISION_LIMIT: REVISION_LIMIT
  };
})();
