/**
 * HypeConnect Auth Service
 * Core authentication logic: login, logout, session management, state
 * Shared between main page and party-connect page
 */

(function() {
  'use strict';

  // Auth states
  const AUTH_STATE = {
    INITIALIZING: 'INITIALIZING',
    SIGNED_OUT: 'SIGNED_OUT',
    AUTH_REDIRECTING: 'AUTH_REDIRECTING',
    AUTH_CALLBACK: 'AUTH_CALLBACK',
    ONBOARDING_REQUIRED: 'ONBOARDING_REQUIRED',
    SIGNED_IN: 'SIGNED_IN',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    AUTH_ERROR: 'AUTH_ERROR',
    SIGNING_OUT: 'SIGNING_OUT'
  };

  // Return URL storage key
  const RETURN_URL_KEY = 'partylink:returnUrl';
  const LOGIN_PENDING_KEY = 'partylink:loginPending';

  // Auth service state
  let currentState = AUTH_STATE.INITIALIZING;
  let currentUser = null;
  let authSubscriptions = [];
  let stateListeners = [];

  // Get PARTYLINK_AUTH (initialized in auth-client.js)
  function getAuthClient() {
    return window.PARTYLINK_AUTH || { live: false, client: null };
  }

  // Notify state listeners
  function notifyStateChange(state, user) {
    currentState = state;
    currentUser = user;
    stateListeners.forEach(listener => {
      try {
        listener(state, user);
      } catch (e) {
        console.error('Auth state listener error:', e);
      }
    });
  }

  // Subscribe to auth state changes
  function subscribe(listener) {
    stateListeners.push(listener);
    // Return unsubscribe function
    return () => {
      stateListeners = stateListeners.filter(l => l !== listener);
    };
  }

  // Get current auth state
  function getState() {
    return currentState;
  }

  // Get current user
  function getUser() {
    return currentUser;
  }

  // Check if user is authenticated
  function isAuthenticated() {
    return currentState === AUTH_STATE.SIGNED_IN && currentUser !== null;
  }

  // Save return URL for post-login redirect
  function saveReturnUrl(partyId, intent = 'apply') {
    const returnInfo = {
      returnPath: window.location.pathname + window.location.search,
      partyId,
      intent,
      createdAt: Date.now()
    };
    try {
      sessionStorage.setItem(RETURN_URL_KEY, JSON.stringify(returnInfo));
    } catch (e) {
      console.warn('Failed to save return URL:', e);
    }
  }

  // Get and clear return URL
  function consumeReturnUrl() {
    try {
      const stored = sessionStorage.getItem(RETURN_URL_KEY);
      if (stored) {
        const info = JSON.parse(stored);
        // Expire after 10 minutes
        if (Date.now() - info.createdAt < 10 * 60 * 1000) {
          sessionStorage.removeItem(RETURN_URL_KEY);
          return info;
        }
      }
    } catch (e) {
      console.warn('Failed to consume return URL:', e);
    }
    sessionStorage.removeItem(RETURN_URL_KEY);
    return null;
  }

  // Clear return URL
  function clearReturnUrl() {
    try {
      sessionStorage.removeItem(RETURN_URL_KEY);
    } catch (e) {}
  }

  // Set login pending flag
  function setLoginPending() {
    try {
      sessionStorage.setItem(LOGIN_PENDING_KEY, '1');
    } catch (e) {}
  }

  // Check and clear login pending flag
  function checkAndClearLoginPending() {
    try {
      const pending = sessionStorage.getItem(LOGIN_PENDING_KEY) === '1';
      sessionStorage.removeItem(LOGIN_PENDING_KEY);
      return pending;
    } catch (e) {
      return false;
    }
  }

  // Kakao OAuth login
  async function loginWithKakao() {
    const { live, client } = getAuthClient();
    
    if (!live || !client) {
      throw new Error("실서비스 모드에서만 카카오 로그인이 가능합니다.");
    }

    setLoginPending();
    
    notifyStateChange(AUTH_STATE.AUTH_REDIRECTING, null);

    const redirectTo = window.location.origin + window.location.pathname + window.location.search;
    
    const { error } = await client.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo }
    });

    if (error) {
      notifyStateChange(AUTH_STATE.AUTH_ERROR, null);
      throw new Error("카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    
    // OAuth redirect happens, we won't reach here normally
    return { success: true };
  }

  // Handle OAuth callback (called from callback page)
  async function handleCallback() {
    const { live, client, toAppUser } = getAuthClient();
    
    if (!live || !client) {
      throw new Error("실서비스 모드가 아닙니다.");
    }

    notifyStateChange(AUTH_STATE.AUTH_CALLBACK, null);

    try {
      // Wait for session to be established (detectSessionInUrl handles PKCE)
      const { data: { session }, error } = await client.auth.getSession();
      
      if (error) throw error;
      
      if (!session) {
        throw new Error("인증 세션을 생성하지 못했습니다. 다시 시도해 주세요.");
      }

      const user = toAppUser(session.user);
      
      // Check if onboarding is needed
      const needsOnboarding = !user.onboardingComplete;
      
      if (needsOnboarding) {
        notifyStateChange(AUTH_STATE.ONBOARDING_REQUIRED, user);
      } else {
        notifyStateChange(AUTH_STATE.SIGNED_IN, user);
      }
      
      return { user, needsOnboarding };
    } catch (error) {
      notifyStateChange(AUTH_STATE.AUTH_ERROR, null);
      throw error;
    }
  }

  // Complete onboarding (save consent to server)
  async function completeOnboarding(consentData) {
    const { live, api, toAppUser } = getAuthClient();
    
    if (!live || !api) {
      throw new Error("실서비스 모드에서만 가입 처리가 가능합니다.");
    }

    try {
      // Call onboarding API
      const result = await api('me/onboarding', {
        method: 'POST',
        body: consentData
      });

      // Refresh user to get updated onboarding status
      const { data: { session } } = await getAuthClient().client.auth.getSession();
      if (session) {
        const user = toAppUser(session.user);
        notifyStateChange(AUTH_STATE.SIGNED_IN, user);
        return { success: true, user };
      }
      
      throw new Error("가입 처리 후 세션을 확인할 수 없습니다.");
    } catch (error) {
      // Don't change state on failure - stay in ONBOARDING_REQUIRED
      throw error;
    }
  }

  // Restore session on page load
  async function restoreSession() {
    const { live, client, toAppUser } = getAuthClient();
    
    if (!live || !client) {
      notifyStateChange(AUTH_STATE.SIGNED_OUT, null);
      return { user: null };
    }

    try {
      const { data: { session } } = await client.auth.getSession();
      
      if (session) {
        const user = toAppUser(session.user);
        
        // Check if onboarding is needed
        if (!user.onboardingComplete) {
          notifyStateChange(AUTH_STATE.ONBOARDING_REQUIRED, user);
        } else {
          notifyStateChange(AUTH_STATE.SIGNED_IN, user);
        }
        
        // Set up auth state listener for cross-tab session sync
        const { data: { subscription } } = client.auth.onAuthStateChange((event, newSession) => {
          if (event === 'SIGNED_OUT' || !newSession) {
            notifyStateChange(AUTH_STATE.SIGNED_OUT, null);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const user = toAppUser(newSession.user);
            if (!user.onboardingComplete) {
              notifyStateChange(AUTH_STATE.ONBOARDING_REQUIRED, user);
            } else {
              notifyStateChange(AUTH_STATE.SIGNED_IN, user);
            }
          }
        });
        
        authSubscriptions.push(subscription);
        
        // Check if login was just completed
        const wasLoginPending = checkAndClearLoginPending();
        if (wasLoginPending) {
          // Show welcome toast via callback
          window.dispatchEvent(new CustomEvent('partylink:welcome', { 
            detail: { isNewUser: !user.onboardingComplete } 
          }));
        }
        
        return { user };
      } else {
        notifyStateChange(AUTH_STATE.SIGNED_OUT, null);
        return { user: null };
      }
    } catch (error) {
      console.error('Session restore failed:', error);
      notifyStateChange(AUTH_STATE.AUTH_ERROR, null);
      return { user: null, error };
    }
  }

  // Logout
  async function logout() {
    const { live, client } = getAuthClient();
    
    notifyStateChange(AUTH_STATE.SIGNING_OUT, currentUser);
    
    try {
      if (live && client) {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      }
      
      // Clear local state
      notifyStateChange(AUTH_STATE.SIGNED_OUT, null);
      
      // Clean up subscriptions
      authSubscriptions.forEach(sub => sub.unsubscribe());
      authSubscriptions = [];
      
      return { success: true };
    } catch (error) {
      // Restore previous state on failure
      notifyStateChange(currentState, currentUser);
      throw new Error("로그아웃 처리에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  // Get user profile (for MyPage)
  async function getProfile() {
    const { live, api } = getAuthClient();
    
    if (!live || !api) {
      throw new Error("실서비스 모드에서만 프로필 조회가 가능합니다.");
    }
    
    return await api('me');
  }

  // Expose globally
  window.PARTYLINK_AUTH_SERVICE = {
    AUTH_STATE,
    getState,
    getUser,
    isAuthenticated,
    subscribe,
    loginWithKakao,
    handleCallback,
    completeOnboarding,
    restoreSession,
    logout,
    getProfile,
    saveReturnUrl,
    consumeReturnUrl,
    clearReturnUrl
  };
})();