/**
 * PartyConnect My-Page application extras
 * - status guidance (what happens next)
 * - reject reason
 * - mission URL submit / re-submit form (shown when status is VISITED)
 * Shared between main page and party-connect page.
 * NOTE: Uses React.createElement instead of JSX for direct browser execution.
 * User-provided text is rendered only as React text children (no innerHTML).
 */

(function() {
  'use strict';

  const React = window.React;
  if (!React || !React.createElement) {
    console.error('[mission-ui.js] React not available');
    window.PARTYLINK_MISSION_UI = { ApplicationExtras: () => null };
    return;
  }
  const e = React.createElement;
  const useState = React.useState;

  function partyApi() {
    return window.PARTYLINK_PARTY_API || {};
  }

  function MissionSubmitForm({ application, onSubmitted }) {
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const inputId = 'mission-url-' + application.id;

    const handleSubmit = async (ev) => {
      ev.preventDefault();
      if (submitting) return;
      const api = partyApi();
      const trimmed = url.trim();
      if (!api.isValidMissionUrl || !api.isValidMissionUrl(trimmed)) {
        setError('http:// 또는 https:// 로 시작하는 올바른 주소를 입력해 주세요.');
        return;
      }
      setError('');
      setSubmitting(true);
      try {
        await api.submitMission(application.id, trimmed);
        setUrl('');
        if (onSubmitted) await onSubmitted(application);
      } catch (err) {
        setError((err && err.message) || '미션 제출에 실패했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSubmitting(false);
      }
    };

    return e('form', {
      onSubmit: handleSubmit,
      noValidate: true,
      className: 'mt-3 space-y-2',
      'data-testid': 'mission-form'
    }, [
      e('label', { key: 'label', htmlFor: inputId, className: 'block text-sm font-medium text-zinc-700' }, '미션 링크 (후기 게시글 주소)'),
      e('input', {
        key: 'input',
        id: inputId,
        type: 'url',
        inputMode: 'url',
        autoComplete: 'off',
        placeholder: 'https://',
        value: url,
        onChange: (ev) => setUrl(ev.target.value),
        disabled: submitting,
        'aria-invalid': error ? 'true' : 'false',
        'aria-describedby': error ? inputId + '-error' : undefined,
        className: 'w-full px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[44px]'
      }),
      error ? e('p', { key: 'error', id: inputId + '-error', role: 'alert', className: 'text-sm text-rose-600' }, error) : null,
      e('button', {
        key: 'submit',
        type: 'submit',
        disabled: submitting,
        className: 'w-full py-2.5 rounded-xl text-sm font-bold text-white min-h-[44px] transition ' + (submitting ? 'bg-zinc-300 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700')
      }, submitting ? '제출 중...' : '미션 제출하기')
    ]);
  }

  function ApplicationExtras({ application, onChanged }) {
    const api = partyApi();
    const status = String(application.status || 'APPLIED').toUpperCase();
    const hint = api.getStatusHint ? api.getStatusHint(status) : '';
    const showMission = api.canSubmitMission ? api.canSubmitMission(status) : false;

    return e('div', { className: 'mt-2 space-y-2', 'data-testid': 'application-extras' }, [
      hint ? e('p', { key: 'hint', className: 'text-sm text-zinc-600' }, hint) : null,
      status === 'REJECTED' && application.rejectReason
        ? e('p', { key: 'reject', className: 'text-sm text-zinc-500' }, '사유: ' + application.rejectReason)
        : null,
      showMission ? e(MissionSubmitForm, { key: 'mission', application, onSubmitted: onChanged }) : null
    ]);
  }

  window.PARTYLINK_MISSION_UI = { MissionSubmitForm, ApplicationExtras };
})();
