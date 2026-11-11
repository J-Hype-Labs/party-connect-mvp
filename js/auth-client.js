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
  const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
  const isLocal = LOCAL_HOSTS.includes(window.location.hostname);

  // Ensure Supabase is available (loaded via CDN before this script)
  if (!window.supabase) {
    console.warn('[auth-client.js] Supabase not available on window.supabase');
    window.supabase = { createClient: function() { return null; } };
  }

  // Pure mode resolver (exposed for tests): keeps hosted production sites honest.
  //  - local hosts keep the old contract: live only when ?live=1 (and ?demo=1 off)
  //  - every other host (GitHub Pages, staging, ...): configured wins; ?demo=1
  //    must NOT be usable to drop a configured production site into demo mode
  //  - unconfigured hosted site: not live => callers must fail closed (no demo data)
  // @param {{ configured: boolean, hostname: string, searchParams?: URLSearchParams }} opts
  function resolveLiveMode({ configured, hostname, searchParams = new URLSearchParams() } = {}) {
    if (LOCAL_HOSTS.includes(hostname)) {
      return Boolean(configured) && searchParams.get("demo") !== "1" && searchParams.get("live") === "1";
    }
    return Boolean(configured);
  }

  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const live = resolveLiveMode({ configured, hostname: window.location.hostname, searchParams: params });

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
    configured,
    client,
    api,
    toAppUser,
    cfg,
    isLocal,
    isProduction,
    getEnvironment,
    environment: getEnvironment(),
    resolveLiveMode
  };
})();