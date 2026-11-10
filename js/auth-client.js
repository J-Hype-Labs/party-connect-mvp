/**
 * HypeConnect Auth Client
 * Supabase client initialization and configuration
 * Shared between main page and party-connect page
 */

(function() {
  'use strict';

  // Configuration from window.PARTYLINK_CONFIG
  const cfg = window.PARTYLINK_CONFIG || {};
  const params = new URLSearchParams(window.location.search);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  
  // Ensure Supabase is available (loaded via CDN before this script)
  if (!window.supabase) {
    console.warn('[auth-client.js] Supabase not available on window.supabase');
    window.supabase = { createClient: function() { return null; } };
  }
  
  // Production mode: configured + not demo + (not local OR live=1)
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const live = configured && params.get("demo") !== "1" && (!isLocal || params.get("live") === "1");

  // Supabase client (only created in live mode)
  let client = null;
  if (live) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  // API helper for Edge Functions
  async function api(path, { method = "GET", body } = {}) {
    if (!live || !client) {
      throw new Error("실서비스 모드가 아닙니다. Supabase 설정을 확인하세요.");
    }
    
    const { data: { session } } = await client.auth.getSession();
    const token = session ? session.access_token : cfg.supabaseAnonKey;
    
    let res;
    try {
      res = await fetch(`${cfg.supabaseUrl}/functions/v1/partylink-api/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          apikey: cfg.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new Error("서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.");
    }
    
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.message || "요청을 처리하지 못했습니다.");
      err.status = res.status;
      err.code = json.code;
      throw err;
    }
    return json;
  }

  // Convert Supabase user to app user format
  function toAppUser(u) {
    if (!u) return null;
    const meta = u.user_metadata || {};
    return {
      id: u.id,
      name: meta.name || meta.full_name || meta.nickname || meta.preferred_username || "카카오유저",
      avatar: "🟡",
      email: u.email || null,
      provider: (u.app_metadata && u.app_metadata.provider) || "kakao",
      joinedAt: u.created_at,
      preferences: { regions: [], categories: [] },
      onboardingComplete: !!(u.user_metadata && u.user_metadata.onboarding_complete)
    };
  }

  // Check if running in production (GitHub Pages)
  function isProduction() {
    return !isLocal && window.location.hostname.includes("github.io");
  }

  // Get current environment
  function getEnvironment() {
    if (isProduction()) return "production";
    if (isLocal) return "development";
    return "staging";
  }

  // Expose globally
  window.PARTYLINK_AUTH = {
    live,
    client,
    api,
    toAppUser,
    cfg,
    isLocal,
    isProduction,
    getEnvironment
  };
})();