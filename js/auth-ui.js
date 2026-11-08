/**
 * PartyConnect Auth UI Components
 * Login modal, onboarding screen, callback handling, header profile menu
 * Shared between main page and party-connect page
 */

(function() {
  'use strict';

  const { useState, useEffect, useCallback } = React;

  // Toast helper
  function showToast(message, duration = 2500) {
    const event = new CustomEvent('partylink:toast', { detail: { message, duration } });
    window.dispatchEvent(event);
  }

  // Kakao Login Button Component
  function KakaoLoginButton({ onClick, disabled, className = "" }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 bg-white rounded-xl hover:bg-zinc-50 transition min-h-[52px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24C14.52 17.16 12.96 16.68 12 16.68s-2.52.48-3.48 1.02c-.36.24-.78.12-1.02-.24-.48-.48-.6-1.32-.24-1.92.48-.72 1.32-1.08 2.16-1.08.72 0 1.44.36 1.92 1.02.48.6.6 1.44.24 1.92zm1.56-5.28c-.72-.36-1.56-.48-2.28-.48-.96 0-1.8.36-2.4 1.08-.6.6-.84 1.44-.72 2.16.12.72.48 1.32 1.08 1.8.72.48 1.56.6 2.4.6.84 0 1.68-.24 2.28-.72.6-.48.84-1.32.72-2.16-.12-.72-.48-1.32-1.08-1.8-.48-.6-1.32-.84-2.16-.72zm-2.52-3.12c-1.2 0-2.16.6-2.76 1.56-.6.96-.6 2.16 0 3.12.6.96 1.56 1.56 2.76 1.56 1.08 0 2.04-.48 2.64-1.32.6-.72.84-1.68.6-2.76-.24-1.08-.84-1.92-1.8-2.52-.72-.48-1.56-.72-2.64-.72zm3.12 9.36c-.6 0-1.08-.36-1.32-.96-.24-.48-.12-1.08.24-1.44.48-.36 1.08-.6 1.8-.6.72 0 1.32.24 1.8.6.36.36.6.96.36 1.44-.24.48-.84.72-1.68.72z"/>
        </svg>
        <span className="font-medium text-zinc-900">카카오로 계속하기</span>
      </button>
    );
  }

  // Loading Button Component
  function KakaoLoginLoadingButton({ className = "" }) {
    return (
      <button
        disabled
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 bg-white rounded-xl min-h-[52px] opacity-50 cursor-not-allowed ${className}`}
      >
        <svg className="animate-spin h-5 w-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="font-medium text-zinc-900">카카오 로그인 연결 중...</span>
      </button>
    );
  }

  // Login Modal Component
  function LoginModal({ isOpen, onClose, onLogin, isLoading, isLive }) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="로그인" onClick={onClose}>
        <div className="relative w-full max-w-sm max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 transition z-10" aria-label="닫기">
            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="p-6 sm:p-8 text-center">
            <div className="text-xl font-extrabold tracking-tighter text-zinc-950 mb-4">
              PARTY<span className="text-rose-600">connect</span>
            </div>
            <p className="mt-2 text-sm text-zinc-500 mb-6">
              파티에 참여할 준비가 됐나요?
            </p>
            <p className="text-sm text-zinc-500 mb-6">
              카카오 계정으로 간편하게 시작하고 마음에 드는 파티에 신청하세요.
            </p>
            <div className="space-y-3">
              {isLoading ? (
                <KakaoLoginLoadingButton />
              ) : (
                <KakaoLoginButton onClick={onLogin} disabled={!isLive} />
              )}
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              {isLive 
                ? '이용약관 및 개인정보 처리방침에 동의하게 됩니다.' 
                : '데모 모드: 실제 서비스에서는 카카오 로그인으로 연동됩니다.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <a href="#terms" className="underline hover:text-zinc-600">이용약관</a>
              <span>·</span>
              <a href="#privacy" className="underline hover:text-zinc-600">개인정보 처리방침</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Auth Processing Screen (Callback Page)
  function AuthProcessingScreen({ message = "카카오 로그인을 확인하고 있어요.", subMessage = "잠시 후 자동으로 이동해요." }) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="text-center animate-fade-in">
          <div className="text-xl font-extrabold tracking-tighter text-zinc-950 mb-4">
            PARTY<span className="text-rose-600">connect</span>
          </div>
          <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-base text-zinc-700 mb-2">{message}</p>
          <p className="text-sm text-zinc-500">{subMessage}</p>
        </div>
      </div>
    );
  }

  // Onboarding Consent Screen
  function OnboardingScreen({ user, onComplete, onError, isSubmitting }) {
    const [consents, setConsents] = useState({
      terms: false,
      privacy: false,
      marketing: false
    });

    const canSubmit = consents.terms && consents.privacy;

    const handleToggle = (key) => {
      setConsents(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!canSubmit) return;

      try {
        await onComplete({
          terms_accepted: consents.terms,
          privacy_accepted: consents.privacy,
          marketing_opt_in: consents.marketing,
          terms_version: '1.0',
          privacy_version: '1.0'
        });
      } catch (error) {
        onError(error.message);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="회원가입">
        <div className="relative w-full max-w-sm max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="text-xl font-extrabold tracking-tighter text-zinc-950 mb-2">
                PARTY<span className="text-rose-600">connect</span>
              </div>
              <p className="text-sm text-zinc-500">
                파티커넥트에 오신 걸 환영해요
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                시작하기 전에 필요한 내용을 확인해요
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Terms Consent */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition">
                <input
                  type="checkbox"
                  checked={consents.terms}
                  onChange={() => handleToggle('terms')}
                  className="mt-1 w-5 h-5 text-rose-600 border-zinc-300 rounded focus:ring-rose-500 focus:ring-2"
                  required
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">서비스 이용약관 동의</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">필수</span>
                  </div>
                  <a href="#terms" className="text-xs text-rose-600 hover:underline mt-1 inline-block">내용 보기</a>
                </div>
              </label>

              {/* Privacy Consent */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition">
                <input
                  type="checkbox"
                  checked={consents.privacy}
                  onChange={() => handleToggle('privacy')}
                  className="mt-1 w-5 h-5 text-rose-600 border-zinc-300 rounded focus:ring-rose-500 focus:ring-2"
                  required
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">개인정보 수집·이용 동의</span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">필수</span>
                  </div>
                  <a href="#privacy" className="text-xs text-rose-600 hover:underline mt-1 inline-block">내용 보기</a>
                </div>
              </label>

              {/* Marketing Consent (Optional) */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition">
                <input
                  type="checkbox"
                  checked={consents.marketing}
                  onChange={() => handleToggle('marketing')}
                  className="mt-1 w-5 h-5 text-rose-600 border-zinc-300 rounded focus:ring-rose-500 focus:ring-2"
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">이벤트·혜택 소식 받기</span>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">선택</span>
                  </div>
                </div>
              </label>

              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className={`w-full py-3 rounded-xl font-semibold text-white transition min-h-[52px] ${canSubmit && !isSubmitting ? 'bg-rose-600 hover:bg-rose-700' : 'bg-zinc-300 cursor-not-allowed'}`}
              >
                {isSubmitting ? '처리 중...' : '시작하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Welcome Toast Component
  function WelcomeToast({ isOpen, onClose, isNewUser }) {
    if (!isOpen) return null;

    return (
      <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
        <div className="bg-white rounded-xl shadow-xl border border-zinc-200 p-4 flex items-center gap-3 min-w-[280px] max-w-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-zinc-900">파티커넥트에 오신 걸 환영해요!</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isNewUser ? '가입이 완료되었어요. 원하는 파티에 신청해 보세요.' : '다시 오신 걸 환영합니다.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600" aria-label="닫기">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Error Toast Component
  function ErrorToast({ message, onClose }) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
        <div className="bg-white rounded-xl shadow-xl border border-rose-200 p-4 flex items-center gap-3 min-w-[280px] max-w-sm">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-zinc-900">오류가 발생했어요</p>
            <p className="text-xs text-zinc-500 mt-0.5">{message}</p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600" aria-label="닫기">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Profile Menu Component
  function ProfileMenu({ user, onMyPage, onLogout, onClose }) {
    return (
      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 animate-fade-in" role="menu">
        <div className="px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-2xl" aria-hidden="true">
              {user?.avatar || '🟡'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 truncate">{user?.name || '사용자'}</p>
              <p className="text-xs text-zinc-500">카카오로 로그인됨</p>
            </div>
          </div>
        </div>
        <button onClick={onMyPage} className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2" role="menuitem">
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          마이페이지
        </button>
        <button onClick={onLogout} className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2" role="menuitem">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          로그아웃
        </button>
      </div>
    );
  }

  // Export components
  window.PARTYLINK_AUTH_UI = {
    LoginModal,
    AuthProcessingScreen,
    OnboardingScreen,
    WelcomeToast,
    ErrorToast,
    ProfileMenu,
    KakaoLoginButton,
    KakaoLoginLoadingButton,
    showToast
  };
})();