/**
 * PartyConnect Auth UI Components
 * Login modal, onboarding screen, callback handling, header profile menu
 * Shared between main page and party-connect page
 * NOTE: Uses React.createElement instead of JSX for direct browser execution
 */

(function() {
  'use strict';

  const React = window.React;
  if (!React || !React.createElement) {
    console.error('[auth-ui.js] React not available');
    window.React = { createElement: () => null, useState: () => [null, () => {}] };
  }
  const e = React.createElement;

  // Toast helper
  function showToast(message, duration = 2500) {
    const event = new CustomEvent('partylink:toast', { detail: { message, duration } });
    window.dispatchEvent(event);
  }

  // Kakao Login Button Component
  function KakaoLoginButton({ onClick, disabled, className = "" }) {
    return e('button', {
      onClick: onClick,
      disabled: disabled,
      className: 'w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 bg-white rounded-xl hover:bg-zinc-50 transition min-h-[52px] ' + (disabled ? 'opacity-50 cursor-not-allowed' : '') + ' ' + className
    }, [
      e('svg', { key: 'icon', className: 'w-6 h-6', fill: 'currentColor', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
        e('path', { key: 'path', d: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24C14.52 17.16 12.96 16.68 12 16.68s-2.52.48-3.48 1.02c-.36.24-.78.12-1.02-.24-.48-.48-.6-1.32-.24-1.92.48-.72 1.32-1.08 2.16-1.08.72 0 1.44.36 1.92 1.02.48.6.6 1.44.24 1.92zm1.56-5.28c-.72-.36-1.56-.48-2.28-.48-.96 0-1.8.36-2.4 1.08-.6.6-.84 1.44-.72 2.16.12.72.48 1.32 1.08 1.8.72.48 1.56.6 2.4.6.84 0 1.68-.24 2.28-.72.6-.48.84-1.32.72-2.16-.12-.72-.48-1.32-1.08-1.8-.48-.6-1.32-.84-2.16-.72zm-2.52-3.12c-1.2 0-2.16.6-2.76 1.56-.6.96-.6 2.16 0 3.12.6.96 1.56 1.56 2.76 1.56 1.08 0 2.04-.48 2.64-1.32.6-.72.84-1.68.6-2.76-.24-1.08-.84-1.92-1.8-2.52-.72-.48-1.56-.72-2.64-.72zm3.12 9.36c-.6 0-1.08-.36-1.32-.96-.24-.48-.12-1.08.24-1.44.48-.36 1.08-.6 1.8-.6.72 0 1.32.24 1.8.6.36.36.6.96.36 1.44-.24.48-.84.72-1.68.72z' })
      ),
      e('span', { key: 'text', className: 'font-medium text-zinc-900' }, '카카오로 계속하기')
    ]);
  }

  // Loading Button Component
  function KakaoLoginLoadingButton({ className = "" }) {
    return e('button', {
      disabled: true,
      className: 'w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-200 bg-white rounded-xl min-h-[52px] opacity-50 cursor-not-allowed ' + className
    }, [
      e('svg', { key: 'spinner', className: 'animate-spin h-5 w-5 text-zinc-500', xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24' }, [
        e('circle', { key: 'circle', className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
        e('path', { key: 'path', className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
      ]),
      e('span', { key: 'text', className: 'font-medium text-zinc-900' }, '카카오 로그인 연결 중...')
    ]);
  }

  // Login Modal Component
  function LoginModal({ isOpen, onClose, onLogin, isLoading, isLive }) {
    if (!isOpen) return null;

    return e('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': '로그인',
      onClick: onClose
    }, e('div', {
      className: 'relative w-full max-w-sm max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up',
      onClick: function(e) { e.stopPropagation(); }
    }, [
      e('button', {
        key: 'close',
        onClick: onClose,
        className: 'absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 transition z-10',
        'aria-label': '닫기'
      }, e('svg', { className: 'w-5 h-5 text-zinc-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
      )),
      e('div', {
        key: 'content',
        className: 'p-6 sm:p-8 text-center'
      }, [
        e('div', { key: 'logo', className: 'text-xl font-extrabold tracking-tighter text-zinc-950 mb-4' }, [
          'PARTY', e('span', { key: 'connect', className: 'text-rose-600' }, 'connect')
        ]),
        e('p', { key: 'desc1', className: 'mt-2 text-sm text-zinc-500 mb-6' }, '파티에 참여할 준비가 됐나요?'),
        e('p', { key: 'desc2', className: 'text-sm text-zinc-500 mb-6' }, '카카오 계정으로 간편하게 시작하고 마음에 드는 파티에 신청하세요.'),
        e('div', { key: 'buttons', className: 'space-y-3' }, [
          isLoading ? e(KakaoLoginLoadingButton, { key: 'loading' }) : e(KakaoLoginButton, { key: 'login', onClick: onLogin, disabled: !isLive })
        ]),
        e('p', { key: 'terms', className: 'mt-4 text-xs text-zinc-400' }, isLive ? '이용약관 및 개인정보 처리방침에 동의하게 됩니다.' : '데모 모드: 실제 서비스에서는 카카오 로그인으로 연동됩니다.'),
        e('div', { key: 'links', className: 'mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400' }, [
          e('a', { key: 'terms', href: '#terms', className: 'underline hover:text-zinc-600' }, '이용약관'),
          e('span', { key: 'dot' }, '·'),
          e('a', { key: 'privacy', href: '#privacy', className: 'underline hover:text-zinc-600' }, '개인정보 처리방침')
        ])
      ])
    ]));
  }

  // Auth Processing Screen (Callback Page)
  function AuthProcessingScreen({ message = "카카오 로그인을 확인하고 있어요.", subMessage = "잠시 후 자동으로 이동해요." }) {
    return e('div', { className: 'min-h-screen flex items-center justify-center p-4 bg-white' },
      e('div', { className: 'text-center animate-fade-in' }, [
        e('div', { key: 'logo', className: 'text-xl font-extrabold tracking-tighter text-zinc-950 mb-4' }, [
          'PARTY', e('span', { key: 'connect', className: 'text-rose-600' }, 'connect')
        ]),
        e('div', { key: 'spinner', className: 'w-12 h-12 border-4 border-zinc-200 border-t-rose-600 rounded-full mx-auto mb-4 animate-spin' }),
        e('p', { key: 'msg', className: 'text-zinc-700 mb-2' }, message),
        e('p', { key: 'submsg', className: 'text-zinc-500 text-sm' }, subMessage)
      ])
    );
  }

  // Welcome Toast Component
  function WelcomeToast({ isOpen, onClose, isNewUser }) {
    if (!isOpen) return null;

    return e('div', { className: 'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up' },
      e('div', { className: 'bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 max-w-md flex items-start gap-3' }, [
        e('div', { key: 'icon', className: 'w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0' },
          e('svg', { className: 'w-5 h-5 text-rose-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M5 13l4 4L19 7' })
          )
        ),
        e('div', { key: 'content', className: 'flex-1' }, [
          e('p', { key: 'title', className: 'font-semibold text-zinc-900' }, isNewUser ? '환영합니다! 파티커넥트 멤버가 되셨어요.' : '다시 오신 것을 환영합니다!'),
          e('p', { key: 'desc', className: 'mt-1 text-sm text-zinc-500' }, '마음에 드는 파티를 찾아 신청해 보세요.'),
          e('div', { key: 'actions', className: 'mt-4 flex gap-2' }, [
            e('a', { key: 'parties', href: 'party-connect/', className: 'flex-1 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition text-center' }, '파티 둘러보기'),
            e('button', { key: 'close', onClick: onClose, className: 'px-4 py-2 text-sm font-semibold border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition' }, '닫기')
          ])
        ]),
        e('button', { key: 'closeBtn', onClick: onClose, className: 'p-1 text-zinc-400 hover:text-zinc-600', 'aria-label': '닫기' },
          e('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ])
    );
  }

  // Error Toast Component
  function ErrorToast({ message, onClose }) {
    return e('div', { className: 'fixed bottom-4 right-4 z-50 animate-slide-up' },
      e('div', { className: 'bg-rose-50 border border-rose-200 rounded-xl shadow-xl p-4 max-w-md flex items-start gap-3' }, [
        e('div', { key: 'icon', className: 'w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5' },
          e('svg', { className: 'w-4 h-4 text-rose-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
          )
        ),
        e('div', { key: 'content', className: 'flex-1' }, [
          e('p', { key: 'title', className: 'font-semibold text-rose-800' }, '오류가 발생했습니다'),
          e('p', { key: 'msg', className: 'mt-1 text-sm text-rose-700' }, message)
        ]),
        e('button', { key: 'close', onClick: onClose, className: 'p-1 text-rose-400 hover:text-rose-600', 'aria-label': '닫기' },
          e('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
          )
        )
      ])
    );
  }

  // Profile Menu Component
  function ProfileMenu({ user, onMyPage, onLogout, onClose }) {
    return e('div', { className: 'absolute right-0 mt-2 w-48 bg-white rounded-xl border border-zinc-200 shadow-xl py-1 animate-slide-up z-50' }, [
      e('div', { key: 'header', className: 'px-4 py-3 border-b border-zinc-100' }, [
        e('p', { key: 'name', className: 'font-semibold text-zinc-900 truncate' }, user.name),
        e('p', { key: 'email', className: 'text-xs text-zinc-500 truncate' }, user.email || '')
      ]),
      e('div', { key: 'divider1', className: 'border-t border-zinc-100 my-1' }),
      e('button', {
        key: 'myPage',
        onClick: onMyPage,
        className: 'w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-2'
      }, [
        e('svg', { key: 'icon', className: 'w-4 h-4 text-zinc-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
        ),
        '마이페이지'
      ]),
      e('button', {
        key: 'logout',
        onClick: onLogout,
        className: 'w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 transition flex items-center gap-2'
      }, [
        e('svg', { key: 'icon', className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
          e('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' })
        ),
        '로그아웃'
      ]),
      e('div', { key: 'divider2', className: 'border-t border-zinc-100 my-1' }),
      e('button', {
        key: 'close',
        onClick: onClose,
        className: 'w-full px-4 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50 transition'
      }, '닫기')
    ]);
  }

  // Onboarding Consent Screen (for new users)
  function OnboardingConsent({ user, onSubmit, onClose, isLoading }) {
    const [agreeTerms, setAgreeTerms] = React.useState(false);
    const [agreePrivacy, setAgreePrivacy] = React.useState(false);
    const [agreeMarketing, setAgreeMarketing] = React.useState(false);

    const allRequired = agreeTerms && agreePrivacy;
    const canSubmit = allRequired && !isLoading;

    return e('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in', role: 'dialog', 'aria-modal': 'true', 'aria-label': '회원가입 동의', onClick: onClose },
      e('div', { className: 'relative w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col animate-slide-up', onClick: function(e) { e.stopPropagation(); } }, [
        e('div', { key: 'header', className: 'p-6 border-b border-zinc-100' }, [
          e('div', { key: 'logo', className: 'text-xl font-extrabold tracking-tighter text-zinc-950 mb-4' }, [
            'PARTY', e('span', { key: 'connect', className: 'text-rose-600' }, 'connect')
          ]),
          e('h2', { key: 'title', className: 'text-lg font-bold text-zinc-900' }, '회원가입을 위해 약관에 동의해 주세요'),
          e('p', { key: 'desc', className: 'mt-2 text-sm text-zinc-500' }, user.name + '님, 환영합니다! 서비스 이용을 위해 다음 약관에 동의가 필요합니다.')
        ]),
        e('div', { key: 'content', className: 'flex-1 overflow-y-auto p-6 space-y-4' }, [
          // Terms of Service (Required)
          e('label', { key: 'terms', className: 'flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition' }, [
            e('input', { type: 'checkbox', checked: agreeTerms, onChange: function(e) { setAgreeTerms(e.target.checked); }, className: 'mt-1 w-5 h-5 text-rose-600 border-zinc-300 rounded focus:ring-rose-500 focus:ring-2', required: true }),
            e('div', { key: 'text' }, [
              e('span', { key: 'required', className: 'text-xs font-semibold text-rose-600 mr-1' }, '(필수)'),
              e('span', { key: 'label', className: 'font-medium text-zinc-900' }, '이용약관'),
              e('a', { key: 'link', href: '#terms', target: '_blank', rel: 'noopener noreferrer', className: 'text-rose-600 hover:underline ml-1 text-sm' }, '(보기)')
            ])
          ]),
          // Privacy Policy (Required)
          e('label', { key: 'privacy', className: 'flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition' }, [
            e('input', { type: 'checkbox', checked: agreePrivacy, onChange: function(e) { setAgreePrivacy(e.target.checked); }, className: 'mt-1 w-5 h-5 text-rose-600 border-zinc-300 rounded focus:ring-rose-500 focus:ring-2', required: true }),
            e('div', { key: 'text' }, [
              e('span', { key: 'required', className: 'text-xs font-semibold text-rose-600 mr-1' }, '(필수)'),
              e('span', { key: 'label', className: 'font-medium text-zinc-900' }, '개인정보 수집·이용 동의'),
              e('a', { key: 'link', href: '#privacy', target: '_blank', rel: 'noopener noreferrer', className: 'text-rose-600 hover:underline ml-1 text-sm' }, '(보기)')
            ])
          ]),
          // Marketing (Optional)
          e('label', { key: 'marketing', className: 'flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition' }, [
            e('input', { type: 'checkbox', checked: agreeMarketing, onChange: function(e) { setAgreeMarketing(e.target.checked); }, className: 'mt-1 w-5 h-5 text-rose-600 border-zinc-300 rounded focus:ring-rose-500 focus:ring-2' }),
            e('div', { key: 'text' }, [
              e('span', { key: 'optional', className: 'text-xs font-semibold text-zinc-500 mr-1' }, '(선택)'),
              e('span', { key: 'label', className: 'font-medium text-zinc-900' }, '마케팅 정보 수신 동의'),
              e('span', { key: 'desc', className: 'text-sm text-zinc-500 ml-1' }, '(추천 파티, 이벤트 알림 등)')
            ])
          ])
        ]),
        e('div', { key: 'footer', className: 'p-6 border-t border-zinc-100' }, [
          e('button', {
            key: 'submit',
            onClick: function() {
              if (canSubmit) {
                onSubmit({ agreeTerms: true, agreePrivacy: true, agreeMarketing: agreeMarketing });
              }
            },
            disabled: !canSubmit,
            className: 'w-full py-3 rounded-xl text-sm font-bold transition min-h-[48px] ' + (canSubmit ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md' : 'bg-zinc-300 text-zinc-500 cursor-not-allowed')
          }, isLoading ? '가입 처리 중...' : '동의하고 시작하기'),
          e('button', {
            key: 'cancel',
            onClick: onClose,
            className: 'w-full mt-2 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-700 transition'
          }, '나중에 하기')
        ])
      ])
    );
  }

  // Export to window
  window.PARTYLINK_AUTH_UI = {
    KakaoLoginButton: KakaoLoginButton,
    KakaoLoginLoadingButton: KakaoLoginLoadingButton,
    LoginModal: LoginModal,
    AuthProcessingScreen: AuthProcessingScreen,
    WelcomeToast: WelcomeToast,
    ErrorToast: ErrorToast,
    ProfileMenu: ProfileMenu,
    OnboardingConsent: OnboardingConsent,
    showToast: showToast
  };
})();