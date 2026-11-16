/**
 * PartyNotify — G-21 사이트 내 알림: 실제 신청 상태 변화에서 알림을 도출한다.
 * 서버 푸시(G-20)는 별도 과제이며, 여기서는 서버 조회 결과의 상태를 이전 확인 상태와
 * 비교해 선정·반려·보완 요청·최종 승인(체험 완료) 알림을 만든다.
 * 최초 조회는 알림 없이 상태만 기록하고, 이후 변화가 있을 때만 알림을 생성한다.
 * 계약: window.PartyNotify.buildEvents(seen, applications) -> { nextSeen, events }
 */
(function () {
  "use strict";

  const STORAGE_PREFIX = "partyconnect:seen-statuses:";

  const STATUS_EVENTS = {
    APPROVED: { type: "selection", title: "선정 확정", message: "신청이 선정되었어요. 마이페이지에서 방문 코드를 확인해 주세요." },
    REJECTED: { type: "rejection", title: "미선정 안내", message: "아쉽게도 이번 파티에 선정되지 않았어요." },
    COMPLETED: { type: "completion", title: "체험 완료", message: "미션이 최종 승인되어 체험이 완료되었어요." }
  };

  const REVISION_EVENT = { type: "revision", title: "보완 요청", message: "미션 보완이 요청되었어요. 마이페이지에서 내용을 확인하고 다시 제출해 주세요." };

  function buildEvents(seen, applications) {
    const prevSeen = seen && typeof seen === "object" && !Array.isArray(seen) ? seen : {};
    const nextSeen = {};
    const events = [];
    const list = Array.isArray(applications) ? applications : [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a || a.id === undefined || a.id === null) continue;
      const id = String(a.id);
      const status = String(a.status || "").toUpperCase();
      nextSeen[id] = status;
      const prev = prevSeen[id];
      if (!prev || prev === status) continue;
      let ev = STATUS_EVENTS[status];
      // MISSION_SUBMITTED -> VISITED 되돌림은 보완 요청이다 (js/party-api.js와 같은 규칙).
      if (!ev && status === "VISITED" && prev === "MISSION_SUBMITTED") ev = REVISION_EVENT;
      if (ev) {
        events.push({
          type: ev.type,
          title: ev.title,
          message: a.partyTitle ? `"${a.partyTitle}" ${ev.message}` : ev.message,
          appId: id,
          status: status
        });
      }
    }
    return { nextSeen: nextSeen, events: events };
  }

  function loadSeen(userId) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + userId);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveSeen(userId, seen) {
    try {
      localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(seen || {}));
    } catch (e) { /* 저장소 불가 시 알림 중복만 발생할 뿐 동작은 유지 */ }
  }

  window.PartyNotify = {
    STATUS_EVENTS: STATUS_EVENTS,
    buildEvents: buildEvents,
    loadSeen: loadSeen,
    saveSeen: saveSeen
  };
})();
