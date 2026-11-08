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
      visitCode: a.visitCode || null
    }));
  }

  // Get status label
  function getStatusLabel(status) {
    const normalized = String(status || 'APPLIED').toUpperCase();
    return APPLICATION_STATUS_LABELS[normalized] || APPLICATION_STATUS_LABELS.APPLIED;
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
    getProfile,
    completeOnboarding,
    normalizeServerParties,
    normalizeServerApplications,
    getStatusLabel,
    isActiveApplication,
    isLive
  };
})();