/**
 * PartyConnect Party API
 * Party list, application, my applications, cancel APIs
 * Shared between main page and party-connect page
 */

(function() {
  'use strict';

  // Application status labels (shared)
  const APPLICATION_STATUS_LABELS = {
    APPLIED: { label: "선정 대기", className: "bg-zinc-100 text-zinc-700" },
    APPROVED: { label: "선정 · 방문 확정", className: "bg-emerald-50 text-emerald-700" },
    VISITED: { label: "방문 인증 완료", className: "bg-sky-50 text-sky-700" },
    MISSION_SUBMITTED: { label: "미션 검수 중", className: "bg-amber-50 text-amber-700" },
    COMPLETED: { label: "체험 완료", className: "bg-emerald-50 text-emerald-700" },
    NOSHOW: { label: "노쇼", className: "bg-rose-50 text-rose-700" },
    REJECTED: { label: "미선정", className: "bg-zinc-100 text-zinc-500" },
    CANCELLED: { label: "취소됨", className: "bg-zinc-100 text-zinc-500" },
  };

  // One-line guidance per status shown on the my-page card
  const APPLICATION_STATUS_HINTS = {
    APPLIED: "운영팀이 참여자를 선정하면 알려드려요. 선정 전에는 직접 취소할 수 있어요.",
    APPROVED: "선정되었어요! 방문할 때 아래 방문 인증 코드를 매장에 보여주세요.",
    VISITED: "방문이 확인되었어요. 체험 후기(미션) 링크를 제출해 주세요.",
    MISSION_SUBMITTED: "미션을 검수하고 있어요. 보완이 필요하면 다시 제출할 수 있어요.",
    COMPLETED: "체험이 모두 완료되었어요. 참여해 주셔서 감사합니다.",
    NOSHOW: "방문하지 않아 노쇼로 처리되었어요.",
    REJECTED: "이번에는 선정되지 않았어요.",
    CANCELLED: "취소된 신청이에요.",
  };

  // Mission URL: http(s) only (same rule as POST /applications/:id/mission)
  function isValidMissionUrl(value) {
    const url = String(value == null ? '' : value).trim();
    if (url.length === 0 || url.length > 1000) return false;
    if (!/^https?:\/\//i.test(url)) return false;
    try {
      const parsed = new URL(url);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0;
    } catch (e) {
      return false;
    }
  }

  // A mission can be (re)submitted only after the visit is verified.
  // MISSION_SUBMITTED -> VISITED happens when an admin asks for a revision.
  function canSubmitMission(status) {
    return String(status || '').toUpperCase() === 'VISITED';
  }

  // Get auth client
  function getAuthClient() {
    return window.PARTYLINK_AUTH || { live: false, api: null };
  }

  // Check if in live mode
  function isLive() {
    const auth = getAuthClient();
    return auth.live === true && auth.api !== null;
  }

  // Fetch parties from server
  async function fetchParties() {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      return { data: [], error: new Error("실서비스 모드가 아닙니다.") };
    }
    
    try {
      const data = await auth.api('parties');
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Fetch my applications from server
  async function fetchMyApplications() {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      return { data: [], error: new Error("실서비스 모드가 아닙니다.") };
    }
    
    try {
      const data = await auth.api('applications');
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (error) {
      // 401 = not authenticated, don't show as error
      if (error.status === 401) {
        return { data: [], error: null };
      }
      return { data: [], error };
    }
  }

  // Apply to party
  async function applyToParty(partyId, applicationData) {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      throw new Error("실서비스 모드에서만 신청할 수 있습니다.");
    }
    
    return await auth.api('applications', {
      method: 'POST',
      body: {
        slotId: partyId,
        ...applicationData
      }
    });
  }

  // Cancel application
  async function cancelApplication(applicationId) {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      throw new Error("실서비스 모드에서만 취소할 수 있습니다.");
    }
    
    return await auth.api(`applications/${applicationId}/cancel`, {
      method: 'POST'
    });
  }

  // Submit (or re-submit after a revision request) the mission URL
  async function submitMission(applicationId, url) {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      throw new Error("실서비스 모드에서만 미션을 제출할 수 있습니다.");
    }
    const trimmed = String(url == null ? '' : url).trim();
    if (!isValidMissionUrl(trimmed)) {
      throw new Error("미션 URL은 http:// 또는 https:// 로 시작하는 주소여야 합니다.");
    }
    return await auth.api(`applications/${encodeURIComponent(applicationId)}/mission`, {
      method: 'POST',
      body: { url: trimmed }
    });
  }

  // Get user profile
  async function getProfile() {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      throw new Error("실서비스 모드에서만 프로필 조회가 가능합니다.");
    }
    
    return await auth.api('me');
  }

  // Complete onboarding
  async function completeOnboarding(consentData) {
    const auth = getAuthClient();
    if (!auth.live || !auth.api) {
      throw new Error("실서비스 모드에서만 가입 처리가 가능합니다.");
    }
    
    return await auth.api('me/onboarding', {
      method: 'POST',
      body: consentData
    });
  }

  // Normalize server party data to match local format
  function normalizeServerParties(serverParties) {
    if (!Array.isArray(serverParties)) return [];
    
    return serverParties.map(p => ({
      id: String(p.id),
      title: p.title,
      region: p.region,
      category: p.category,
      days: Array.isArray(p.days) ? p.days : [],
      recruit: Number(p.recruit) || 0,
      currentRecruit: Number(p.currentRecruit) || 0,
      venue: p.venue,
      address: p.address,
      desc: p.desc || p.description || '',
      images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
      badges: Array.isArray(p.badges) ? p.badges : [],
      isFeatured: Boolean(p.isFeatured)
    }));
  }

  // Normalize server application data
  function normalizeServerApplications(serverApps) {
    if (!Array.isArray(serverApps)) return [];
    
    return serverApps.map(a => ({
      id: String(a.id),
      partyId: String(a.slotId || a.partyId),
      partyTitle: a.partyTitle || a.title || '',
      name: a.name,
      phone: a.phone,
      day: a.day,
      appliedAt: a.appliedAt || a.created_at,
      status: String(a.status || 'APPLIED').toUpperCase(),
      userId: a.userId,
      visitCode: a.visitCode || null,
      rejectReason: a.rejectReason || null,
      startsAt: a.startsAt || null,
      venue: a.venue || ''
    }));
  }

  // Get status label
  function getStatusLabel(status) {
    const normalized = String(status || 'APPLIED').toUpperCase();
    return APPLICATION_STATUS_LABELS[normalized] || APPLICATION_STATUS_LABELS.APPLIED;
  }

  function getStatusHint(status) {
    const normalized = String(status || 'APPLIED').toUpperCase();
    return APPLICATION_STATUS_HINTS[normalized] || '';
  }

  // Check if application is active (not cancelled/rejected)
  function isActiveApplication(status) {
    const normalized = String(status || 'APPLIED').toUpperCase();
    return !['CANCELLED', 'REJECTED'].includes(normalized);
  }

  // Export
  window.PARTYLINK_PARTY_API = {
    APPLICATION_STATUS_LABELS,
    fetchParties,
    fetchMyApplications,
    applyToParty,
    cancelApplication,
    submitMission,
    isValidMissionUrl,
    canSubmitMission,
    getStatusHint,
    getProfile,
    completeOnboarding,
    normalizeServerParties,
    normalizeServerApplications,
    getStatusLabel,
    isActiveApplication,
    isLive
  };
})();