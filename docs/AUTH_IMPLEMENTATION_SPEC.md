# PartyConnect P0-AUTH Implementation Specification

**Spec Version:** 1.0  
**Date:** 2026-11-08  
**Priority:** P0 - Production Ready Auth Integration  
**Frontend:** J-Hype-Labs/party-connect-mvp  
**Backend:** J-Hype-Labs/partylink

---

## 1. Project Goal

Currently PartyConnect is deployed on GitHub Pages but lacks real member authentication and database integration. The goal is to implement **real Kakao OAuth authentication via Supabase Auth**, store and retrieve party applications in Supabase DB, and provide a seamless user experience.

**User Flow:**
```
Visit PartyConnect
    ↓
Browse parties
    ↓
Select party
    ↓
Apply to party
    ↓
Check login status
    │
    ├─ Logged in
    │    ↓
    │  Show application form
    │
    └─ Not logged in
         ↓
      Kakao login prompt
         ↓
      Kakao OAuth
         ↓
      Auth success
         ↓
      Return to PartyConnect
         ↓
      Check if new user
         ↓
      Terms & onboarding
         ↓
      Restore original party application
         ↓
      Submit application
         ↓
      Server validates
         ↓
      Application received
         ↓
      View in MyPage
```

**Key Principle:** User must NOT restart party search after login.

---

## 2. Current State & Required Fixes

### 2.1 Current Implementation

| Item | Current State | Required |
|------|---------------|----------|
| Kakao login button | Implemented | Connect real auth |
| Naver login | Removed | Keep removed |
| Supabase Auth code | Present | Verify & stabilize |
| PKCE setup | Code exists | Verify callback handling |
| Session restore | Code exists | Integrate & error handle |
| Supabase URL/Key | Empty | Production config |
| Dedicated page login | Separate impl | Use common module |
| Main page login | Separate impl | Use common module |
| New user onboarding | Missing | Implement UI |
| Login→apply restore | Missing | Implement |
| Login-state apply | Partial | Full verification |
| Admin auth | Hardcoded password | Block production |

### 2.2 Required Fixes

**AUTH-01. Duplicate Auth Logic**
- `index.html` and `party-connect/index.html` both have auth logic
- Create common auth module (`js/auth-*.js`)

**AUTH-02. Main Page Logout Race Condition**
- Current: Doesn't wait for Supabase signOut completion
- Fix: Wait for response, disable button, handle success/failure

**AUTH-03. Unauthenticated Apply Flow**
- Current: Shows error but doesn't always open login modal
- Fix: Always open login modal when unauthenticated user tries to apply

**AUTH-04. Production Demo Mode Access**
- Current: Can force demo mode via URL params in production
- Fix: Production = real auth only; no auto-fallback to mock

**AUTH-05. Admin Security**
- Current: Hardcoded password in client
- Fix: Server-side auth only; no client-side admin verification

---

## 3. Technical Architecture

### 3.1 Stack
| Area | Technology |
|------|------------|
| Hosting | GitHub Pages |
| UI | React 18 + Babel Standalone + Tailwind |
| Social Auth | Kakao OAuth |
| Auth Service | Supabase Auth |
| Auth Method | OAuth Authorization Code + PKCE |
| API | Supabase Edge Functions |
| DB | Supabase PostgreSQL |
| AuthZ | Server-side verification + RLS |
| Tests | Playwright + API integration |
| CI | GitHub Actions |

**Constraint:** No framework migration. Stabilize auth within existing stack.

### 3.2 Recommended Structure
```
party-connect-mvp/
├── index.html
├── party-connect/
│   └── index.html
├── auth/
│   └── callback/
│       └── index.html
├── js/
│   ├── party-data.js
│   ├── app-config.js
│   ├── auth-client.js      # Supabase client & config
│   ├── auth-service.js     # Auth logic (login, logout, session)
│   ├── auth-ui.js          # Login modal, onboarding, callbacks
│   └── party-api.js        # Party/application API calls
├── tests/
│   ├── auth-unit.spec.js
│   ├── auth-flow.spec.js
│   ├── auth-errors.spec.js
│   ├── auth-security.spec.js
│   └── party-application.spec.js
└── docs/
    ├── AUTH_IMPLEMENTATION_SPEC.md
    ├── AUTH_UI_UX_SPEC.md
    ├── AUTH_DEPLOYMENT_CHECKLIST.md
    └── AUTH_TEST_REPORT.md
```

**Principles:**
- Single Supabase client instance
- Single auth service for login/logout/session
- Both pages use same auth state rules
- No separate user DBs per page
- No auto-deletion of existing localStorage data

---

## 4. Kakao OAuth Integration

### 4.1 Kakao Developers Console
1. Verify/create Kakao app for PartyConnect
2. Enable Kakao Login
3. Register website domain
4. Register OAuth Redirect URI: **Supabase Auth callback**
   ```
   https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
5. Get REST API Key & Client Secret
6. Configure consent items
7. Ensure app is public/operational

### 4.2 Supabase Configuration
```
Authentication → Sign In / Providers → Kakao
- Enable Kakao Provider
- Enter Kakao Client ID & Secret
- Configure email handling for Kakao accounts without email
```

**Site URL:** `https://j-hype-labs.github.io/party-connect-mvp/`

**Production Redirect URL:** `https://j-hype-labs.github.io/party-connect-mvp/auth/callback/`

**Local Redirect URL:** `http://localhost:3000/auth/callback/`

### 4.3 Browser OAuth Callback Page
Dedicated callback page for static GitHub Pages:

```
Kakao Login Start
    ↓
Supabase Auth
    ↓
Kakao OAuth
    ↓
Supabase Auth Callback
    ↓
/party-connect-mvp/auth/callback/
    ↓
Process auth code
    ↓
Verify Supabase Session
    ↓
Return to original page
```

**Callback Requirements:**
1. Read auth success/failure params from URL
2. Handle PKCE code securely
3. Prevent duplicate code exchange
4. Confirm Supabase session creation
5. Check new user status
6. Restore original page
7. Show recoverable error UI
8. Clean sensitive params from URL

**Avoid:** Duplicate `detectSessionInUrl` auto-handling + manual code exchange.

### 4.4 Post-Login Return to Original Page

Store return info before auth:

```json
{
  "returnPath": "/party-connect-mvp/party-connect/",
  "partyId": "party-123",
  "intent": "apply",
  "createdAt": 0
}
```

**Requirements:**
- Only allow internal paths
- Block external URL redirects
- Expire return info
- No sensitive data in URL
- Short TTL for return info
- Clean up after completion/cancel

Example: User viewing Party A → clicks apply → logs in → returns to Party A detail → application form

---

## 5. User Identity & Data Structure

### 5.1 Primary User ID
```
Supabase auth.users.id
```
- NOT name, email, phone
- Kakao external ID managed by Supabase Auth connections
- Never trust client-provided userId

### 5.2 New vs Existing User
After login:
- **New user**: Kakao auth success → needs PartyConnect consent → required consent → save onboarding → start service
- **Existing user**: Kakao auth success → check server onboarding status → skip onboarding → restore data

**Decision based on server data, NOT localStorage.**

### 5.3 Onboarding Data Collection

| Field | When | Required |
|-------|------|----------|
| Supabase User ID | Login | Yes |
| Kakao profile name/nickname | Login | If available |
| Profile image | Login | Optional |
| Email | Login | If provided |
| Terms consent log | First signup | Yes (per item) |
| Real name | First apply | For application |
| Phone | First apply | For application |
| Preferred regions | Settings | Optional |
| Marketing opt-in | Optional | Separate consent |

Kakao login does NOT guarantee phone/real name/adult status.

### 5.4 Consent Logging
Server-side storage:
```
user_id
terms_version
privacy_version
terms_accepted_at
privacy_accepted_at
marketing_opt_in
marketing_consent_at
created_at
updated_at
```

Marketing opt-in = separate optional consent.

---

## 6. UI/UX Design Principles

### 6.1 Design Direction
- **Preserve existing PartyConnect brand design**
- No new design system for auth screens
- Mobile-first, card-based, minimal inputs
- One clear primary action per screen
- Clear real vs demo auth indication
- No flow interruption from login

### 6.2 Design Tokens (Existing)
| Element | Color |
|---------|-------|
| Brand Primary | `#E11D48` |
| Brand Secondary | `#FB7185` |
| Body Text | `#18181B` |
| Muted Text | `#71717A` |
| Border | `#E4E4E7` |
| Background | `#FFFFFF` |
| Secondary BG | `#FAFAFA` |
| Kakao Button BG | `#FEE500` |
| Kakao Button Text | `#191919` |
| Error | `#DC2626` |
| Success | `#059669` |

**Use official Kakao login button assets per guidelines.** No custom drawn Kakao logos/emojis.

### 6.3 Common UI Metrics
| Component | Spec |
|-----------|------|
| Desktop login modal | Max width 420px |
| Mobile login modal | Screen width - 32px |
| Card radius | 16px |
| Primary button height | 52px |
| Secondary button min height | 44px |
| Input height | 48px |
| Modal padding | 24px (desktop), 20px (mobile) |
| Main heading | 22px |
| Body | 14-16px |
| Caption | 12-13px |
| Button text | 15-16px |
| Field gap | 16px |
| Section gap | 24px |

**Test viewports:** 320px, 375px, 390px, 768px, 1280px

---

## 7. Screen-by-Screen UI/UX

### Screen A: Logged Out State

**Header:** Login button only → opens login modal

**Party Detail:** Viewable without login (title, photos, date, region, venue, capacity, benefits, conditions)

**Apply CTA:** "파티 신청하기" → opens login modal (party detail stays behind)

---

### Screen B: Kakao Login Modal

```
┌──────────────────────────────────┐
│                              ✕   │
│                                  │
│         PARTYconnect             │
│                                  │
│      파티에 참여할 준비가 됐나요?     │
│                                  │
│    카카오 계정으로 간편하게 시작하고   │
│      마음에 드는 파티에 신청하세요.   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │      카카오로 계속하기         │ │
│ └──────────────────────────────┘ │
│                                  │
│  로그인하면 서비스 이용약관 및       │
│  개인정보 처리방침을 확인할 수 있어요.│
│                                  │
│       이용약관 · 개인정보 처리방침    │
└──────────────────────────────────┘
```

**Required:**
- PartyConnect logo
- Title + 1-2 line description
- Kakao login button
- Close button
- Terms of Service link
- Privacy Policy link

**NO:** Marketing consent combined with login button

**Button States:**
- Default: "카카오로 계속하기"
- Clicked: "카카오 로그인 연결 중..." (disabled, loading, prevent double-click)
- Modal stable during processing

**Forbidden:**
- Success toast before auth completes
- Mock user creation
- Login complete on button click only
- Auto-fallback to demo on failure
- Double-click creating duplicate auth requests

---

### Screen C: Auth Processing (Callback Page)

```
┌──────────────────────────────┐
│                              │
│        PARTYconnect          │
│                              │
│        ◌ Loading spinner      │
│                              │
│     카카오 로그인을 확인하고     │
│          있어요.              │
│                              │
│      잠시 후 자동으로 이동해요. │
│                              │
└──────────────────────────────┘
```

**Requirements:**
- Prevent duplicate processing
- Show loading during auth
- Show recoverable UI if delayed
- No infinite loading on error
- No sensitive info in console/UI

---

### Screen D: First-Time Onboarding

After Kakao auth success, if no PartyConnect consent:

```
┌──────────────────────────────────┐
│             PARTYconnect         │
│                                  │
│       파티커넥트에 오신 걸 환영해요 │
│                                  │
│   시작하기 전에 필요한 내용을 확인해요│
│                                  │
│ □ [필수] 서비스 이용약관 동의       │
│             [내용 보기]          │
│                                  │
│ □ [필수] 개인정보 수집·이용 동의    │
│             [내용 보기]          │
│                                  │
│ □ [선택] 이벤트·혜택 소식 받기     │
│                                  │
│ ┌──────────────────────────────┐ │
│ │         시작하기             │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**Rules:**
1. Two required consents
2. Optional consent = truly optional
3. Disable "시작하기" if required unchecked
4. Save consent log to server on click
5. Server save success = onboarding complete
6. Server save fail = allow retry

**Per-item consent logging required.**

**On Success:**
"파티커넥트에 오신 걸 환영해요!" → return to original task

No unnecessary multi-step welcome pages.

---

### Screen E: Post-Login Apply Form Restore

**Critical:** Restore the party user was applying to.

```
Party Detail
    ↓
Apply
    ↓
Kakao Login
    ↓
Terms Consent
    ↓
SAME Party's Apply Form
```

**Must Restore:**
- Selected party ID
- Party detail state
- Apply intent
- Pre-login form data (if any, short-lived secure storage)

**No sensitive data in URL or long-term storage.**

If restoration fails → show error, navigate to party detail.

---

### Screen F: Actual Application Form

```
┌──────────────────────────────────┐
│        파티 신청하기              │
│                                  │
│  [Selected Party Info Card]       │
│                                  │
│  신청자 이름                      │
│  ┌────────────────────────────┐  │
│  │ 이름을 입력해 주세요        │  │
│  └────────────────────────────┘  │
│                                  │
│  연락처                          │
│  ┌────────────────────────────┐  │
│  │ 010-0000-0000              │  │
│  └────────────────────────────┘  │
│                                  │
│  참여 일정                        │
│  [Select available dates]         │
│                                  │
│ □ [필수] 파티 신청을 위한          │
│          개인정보 수집·이용 동의   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │          신청하기            │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

**Validation:**
- Name: required, trim, 2+ chars, server validates
- Phone: required, numbers+hyphen, normalized, server validates
- Party: must exist, recruiting, capacity, not past deadline
- Privacy consent: required, viewable purpose/items, blocked if unchecked

**Submit Flow:**
1. Validate inputs
2. Verify session
3. Disable submit button
4. POST to server
5. Wait for response
6. Check success
7. Success → complete screen
8. Fail → show error, keep inputs

**Server uses JWT-verified user ID. Never trust client-provided userId.**

**Success Screen:**
"신청이 접수되었어요!"
"마이페이지에서 신청 상태를 확인할 수 있어요."
Buttons: [내 신청 확인하기] [다른 파티 둘러보기]

**CRITICAL:** `APPLIED` = application received, NOT confirmed participation. Never confuse these.

---

### Screen G: Logged-In Header

**Desktop:**
```
[파티커넥트] [파티 탐색] [알림] [프로필 ▾]
```

Profile dropdown:
```
┌───────────────────────┐
│ 카카오로 로그인됨      │
│ 사용자 닉네임          │
├───────────────────────┤
│ 마이페이지             │
│ 내 신청 내역           │
│ 설정                  │
├───────────────────────┤
│ 로그아웃               │
└───────────────────────┘
```

**Mobile:**
- Keep logo/notification/profile structure
- Profile touch target ≥ 44×44px
- Menu within screen width
- Bottom sheet for narrow screens

**Profile Image:** Use Kakao image if available, else default avatar. No broken image icons.

---

### Screen H: MyPage

**Tabs:** 내 신청 / 찜한 파티 / 내 후기 / 설정 (preserve existing)

**My Applications:** Real DB data only

| Server Status | User Label |
|--------------|------------|
| `APPLIED` | 선정 대기 |
| `APPROVED` | 선정 완료 |
| `VISITED` | 방문 확인 완료 |
| `MISSION_SUBMITTED` | 후기 검토 중 |
| `COMPLETED` | 체험 완료 |
| `CANCELLED` | 신청 취소 |
| `REJECTED` | 선정되지 않음 |
| `NOSHOW` | 미방문 |

**Data Rules:**
- Only logged-in user's applications
- No other user data exposure
- Empty state if no applications
- API error ≠ no applications
- Refresh button

**Logout Button:**
- "로그아웃" → "로그아웃 중..." → success: clear user data, reset UI, show login state
- Fail: keep logged in, show retry

---

## 8. Auth State Management

| State | Meaning | UI |
|-------|---------|-----|
| `INITIALIZING` | Checking session | Loading |
| `SIGNED_OUT` | Not logged in | Login button |
| `AUTH_REDIRECTING` | Starting Kakao | Button loading |
| `AUTH_CALLBACK` | Processing OAuth | Callback loading |
| `ONBOARDING_REQUIRED` | New user consent | Consent screen |
| `SIGNED_IN` | Logged in | Member UI |
| `SESSION_EXPIRED` | Token expired | Re-login prompt |
| `AUTH_ERROR` | Auth error | Error + retry |
| `SIGNING_OUT` | Logging out | Progress |

**Transitions:**
```
INITIALIZING
  ├─ Valid session → SIGNED_IN
  └─ No session → SIGNED_OUT

SIGNED_OUT
  └─ Login click → AUTH_REDIRECTING

AUTH_REDIRECTING
  └─ Kakao auth → AUTH_CALLBACK

AUTH_CALLBACK
  ├─ New user → ONBOARDING_REQUIRED
  ├─ Existing → SIGNED_IN
  └─ Error → AUTH_ERROR

SIGNED_IN
  ├─ Logout → SIGNING_OUT
  └─ Session expiry → SESSION_EXPIRED
```

**Forbidden:**
- Pre-session-check logged-in UI
- Auth error as silent logout
- Mock localStorage user as real server user
- Auto-create demo user on auth check failure

---

## 9. Error Handling UI

All errors in user-friendly Korean.

| Situation | Message | Action |
|-----------|---------|--------|
| Kakao cancel | 로그인이 취소되었어요. | Return to original |
| Kakao error | 카카오 로그인에 실패했어요. 다시 시도해 주세요. | Retry |
| Auth server down | 로그인 서버에 연결할 수 없어요. | Retry |
| Session expired | 로그인 시간이 만료됐어요. 다시 로그인해 주세요. | Login |
| Consent incomplete | 필수 항목을 확인해 주세요. | Stay on consent |
| Profile save fail | 가입 정보를 저장하지 못했어요. | Retry |
| Duplicate apply | 이미 신청한 파티예요. | Go to my applications |
| Recruitment closed | 모집이 마감된 파티예요. | Stay on detail |
| Capacity full | 모집 인원이 모두 찼어요. | Stay on detail |
| Apply blocked | 현재 신청할 수 없는 계정이에요. | Info |
| API slow | 요청을 처리하고 있어요. | Block double-submit |
| Server error | 일시적인 오류가 발생했어요. | Retry |

**Error UI Rules:**
- Preserve inputs
- Clear retry button
- Explain cause & resolution
- No error codes/server internals
- No unnecessary technical terms

Map HTTP status → UI state precisely.

---

## 10. Security Requirements

### SEC-01: Key Separation
**Browser allowed:**
- Supabase Project URL
- Publishable/anon key

**Browser forbidden:**
- Service-role/secret key
- Kakao Client Secret
- Admin password
- DB admin credentials

Secrets → Supabase server-side only.

### SEC-02: Server-Side User Verification
Apply/cancel/history APIs verify JWT on server.
Never trust client-provided name/userId.

### SEC-03: User Data Isolation
User A cannot access User B's:
- Applications
- Contact info
- Application status
- Visit codes
- Profile

Even logged in, other users' API calls blocked.

### SEC-04: Session Management
- Use Supabase built-in session management
- Verify auto-refresh
- Cross-page session persistence
- Clear protected data on logout
- No custom token storage duplication
- No tokens in URLs/analytics

### SEC-05: Role Separation
Kakao OAuth ≠ admin auth.

Roles (server-managed):
```
guest
store_owner
admin
```

Verify via trusted server data. Client-side `role` mutation cannot grant admin.

### SEC-06: Privacy
- Minimal collection
- HTTPS transport
- Purpose-based consent
- Return only needed data
- No PII in logs
- Privacy policy published
- Retention & deletion policy defined

Account deletion/privacy policy → separate review before launch.

### SEC-07: Production Security (Required Before Launch)
- Remove frontend admin password
- Server-side admin verification
- API authorization checks
- RLS verification
- CORS origin restriction
- Auth/apply API abuse prevention
- Secret leak scan

---

## 11. Database & API Integration

### 11.1 Existing Schema
Use existing PartyLink schema:
- `stores`
- `party_slots`
- `guests`
- `applications`
- `deposit_histories`

No duplicate tables for auth. Add migration for onboarding data if needed.

### 11.2 Existing API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/parties` | Public party list |
| GET | `/applications` | My applications |
| POST | `/applications` | Apply to party |
| POST | `/applications/:id/cancel` | Cancel application |

Verify actual Edge Function paths & response formats.

### 11.3 Required Onboarding API

**GET /me**
- Verify logged-in user
- Check onboarding complete
- Return minimal profile
- Check terms version

**POST /me/onboarding**
- Record consent
- Initialize profile
- Mark onboarding complete

Auth user ID from JWT. Implementation matches existing Edge Function structure.

### 11.4 API Consistency
- Clear success response format
- Standardized error codes
- Distinguish 401/403/409/410/423
- Server-side input validation
- DB-level duplicate prevention
- Atomic application processing
- User-scoped data only

**Never treat application as successful before server response.**

---

## 12. Demo vs Production Mode Separation

### 12.1 Production Rules
**Production GitHub Pages = NO demo auth**

```
development → mock allowed
staging     → test Supabase
production  → real Supabase only
```

Production behavior:
- Missing Supabase config → disable login features
- Server connection fail → show error
- `?demo=1` URL param does NOT enable mock auth

**NEVER auto-fallback to mock auth on config/error in production.**

### 12.2 Preserve Dev Data
Don't auto-delete localStorage. But NEVER:
- Auto-convert demo applications to real
- Auto-link mock Naver accounts to real Kakao
- Attribute historical applications to random user IDs

If needed, design separate migration with approval.

---

## 13. Responsive & Accessibility

### 13.1 Modal
- ESC to close
- Close button
- Focus trap inside
- Focus return on close
- Background scroll lock
- Proper z-index
- Vertical scroll on small screens
- Buttons not hidden below fold

### 13.2 Mobile Viewports
Test: 320px, 375px, 390px, 768px, 1280px, 1440px

Verify:
- Login button sizes
- Text wrapping
- iOS Safari keyboard
- Android Chrome keyboard
- Zoom usability
- No horizontal scroll
- Modal close accessibility
- Input preservation
- KakaoTalk in-app browser return

### 13.3 Accessibility
- Keyboard-only login
- Screen reader button labels
- Error-field association
- Loading state announcements
- Not color-only success/fail
- `prefers-reduced-motion`
- Sufficient contrast
- No fake disabled/clickable CTAs

---

## 14. Test Specification

### 14.1 Unit Tests (Required)
1. Auth state transitions
2. Session restore
3. New user detection
4. Return URL generation
5. Return URL validation
6. External redirect blocking
7. Login request deduplication
8. Logout error handling
9. User info mapping
10. Error message mapping
11. Consent validation
12. Application data validation

### 14.2 Browser E2E (Playwright)
| ID | Scenario | Expected |
|----|----------|----------|
| E01 | Visit site logged out | Login button visible |
| E02 | Open login modal | Modal displays |
| E03 | Close login modal | Original screen intact |
| E04 | Click Kakao login | Auth request sent |
| E05 | Double-click login | No duplicate requests |
| E06 | Mock login success | Member UI shown |
| E07 | Mock auth cancel | Cancel message |
| E08 | Mock auth error | Retry available |
| E09 | New user flow | Consent screen |
| E10 | Missing required consent | Can't proceed |
| E11 | Optional consent skipped | Signup works |
| E12 | Onboarding complete | Return to original |
| E13 | Apply while logged out | Login modal opens |
| E14 | Login then apply | Same party restored |
| E15 | Valid apply form | Submittable |
| E16 | Invalid phone format | Error shown |
| E17 | Server apply success | Complete screen |
| E18 | Server apply fail | No false success |
| E19 | Duplicate apply | Blocked |
| E20 | MyPage access | Own history only |
| E21 | Page refresh | Login persists |
| E22 | Main↔Party page | Login persists |
| E23 | Session expiry | Re-login prompt |
| E24 | Logout success | Logged out state |
| E25 | Logout fail | Stays logged in |
| E26 | Prod missing config | No demo fallback |
| E27 | Other user's apply ID | Server rejects |
| E28 | Unauthenticated API call | Server rejects |
| E29 | Mobile modal/keyboard | Layout works |
| E30 | Direct callback URL access | Safe error handling |

**Existing 93 E2E tests MUST continue passing.** New tests pass + old tests fail = incomplete.

### 14.3 Real OAuth Integration Test
Separate from mocks. Use **real Kakao test account**.

Required:
1. First Kakao login
2. Consent screen approval
3. Real Supabase user created
4. PartyConnect onboarding complete
5. Page refresh
6. Main↔Party page navigation
7. Logout
8. Re-login
9. Same account return
10. Real DB application
11. Real DB history view
12. Different browser, same user
13. Different Kakao account blocked from other's data

**Needs:** Production or test Kakao app + Supabase project.

**Mock 100% pass ≠ Real Kakao auth complete.**

---

## 15. UI/UX Independent Audit

After implementation, conduct separate UI/UX audit.

**If using `ui-ux-pro-max` skill:** Actually apply it, don't just log execution.

### 15.1 Audit Screens
- Login modal
- Auth connecting screen
- First onboarding consent
- Login failure screen
- Post-login apply form
- Apply complete screen
- Header profile menu
- MyPage
- Logout
- All mobile screens

### 15.2 Evaluation Criteria
| Criterion | Check |
|-----------|-------|
| Clarity | User knows what to do |
| Consistency | Main & Party same |
| Usability | No unnecessary steps |
| Visual hierarchy | Primary button clear |
| Error recovery | Can retry after fail |
| Accessibility | Keyboard + screen reader |
| Mobile | Works on small screens |
| Trust | No fake success messages |
| Performance | No unnecessary loading |
| Flow continuity | Login→task continues |

### 15.3 Required Screenshots
- Desktop login modal
- Mobile login modal
- First onboarding screen
- Auth error screen
- Post-login apply form
- Apply complete screen
- Mobile MyPage

### 15.4 Issue Format
```
Issue:
Location:
Reproduction:
Expected:
Actual:
User Impact:
Fix:
Re-verification:
```

**Don't finish with known UI issues for user to find.**

---

## 16. Work Phases

### P0-A: Pre-Audit
- [ ] Latest main review
- [ ] Existing auth code analysis
- [ ] Backend PR #1 latest check
- [ ] Real Supabase config check
- [ ] Existing UI impact analysis
- [ ] Admin security risk check
- [ ] Scope documentation

### P0-B: Auth Foundation
- [ ] Common Auth module
- [ ] Kakao OAuth
- [ ] PKCE callback
- [ ] Session restore
- [ ] New user detection
- [ ] Login state management
- [ ] Logout
- [ ] Error handling

### P0-C: UI/UX Implementation
- [ ] Login modal
- [ ] Auth processing screen
- [ ] First onboarding consent
- [ ] Header member UI
- [ ] Post-login return flow
- [ ] Apply form integration
- [ ] MyPage
- [ ] Error/empty states

### P0-D: Server Integration
- [ ] Backend code review
- [ ] Migration review
- [ ] Onboarding API
- [ ] Party list API
- [ ] Apply API
- [ ] My applications API
- [ ] Cancel API
- [ ] Self-authorization
- [ ] RLS verification

### P0-E: Testing
- [ ] 93 existing regression tests
- [ ] New auth tests
- [ ] API integration tests
- [ ] Security tests
- [ ] Mobile tests
- [ ] Real Kakao test account
- [ ] Real DB verification

### P0-F: Deployment
- [ ] Production config check
- [ ] Secret leak scan
- [ ] Admin security resolved
- [ ] PR review
- [ ] CI pass
- [ ] Approved → main merge
- [ ] GitHub Pages deploy
- [ ] Live URL verification
- [ ] Deploy SHA match

---

## 17. Authority & Stop Conditions

This work covers design → implementation → test → PR creation.

**Require explicit approval for:**
- Production DB changes/deletes
- Production migrations
- Secret issuance/rotation
- Real Kakao app config changes
- PII processing start
- Main merge & production auth enable
- Existing user data migration

If console access unavailable → complete code work, report exact user actions needed.

**Never ask for secrets in chat/GitHub issues/PRs.**

---

## 18. Final Completion Criteria

### Auth
- [ ] Real Kakao login works
- [ ] First onboarding works
- [ ] Existing user re-login works
- [ ] Session persists
- [ ] Logout works
- [ ] Auth errors handled

### UX
- [ ] Browse parties without login
- [ ] Apply → login naturally connects
- [ ] Post-login returns to same party
- [ ] Input errors guided properly
- [ ] Mobile login UX works
- [ ] Apply message accurate (APPLIED ≠ APPROVED)

### Data
- [ ] Real DB application save
- [ ] Same user re-fetch works
- [ ] Other user data isolated
- [ ] Duplicate apply blocked
- [ ] Cancel works
- [ ] No demo data leakage

### Production
- [ ] Admin vuln fixed
- [ ] No secret leaks
- [ ] Real OAuth tested
- [ ] Real DB integration tested
- [ ] 93 existing E2E pass
- [ ] Production deploy success
- [ ] Live URL verified

---

## 19. Final Report Format (Korean ELI10)

1. **한 줄 결론:** Real Kakao login usable?
2. **개발 완료 항목:** Implementation + code evidence
3. **UI/UX 변경:** Login before/after screens
4. **사용자 흐름:** Login → Onboarding → Apply → MyPage
5. **테스트 결과:** Mock / Real OAuth / Real DB separated
6. **GitHub 증빙:** PR, SHA, CI, Deploy links
7. **보안 검증:** Admin, RLS, Secrets
8. **미완료 작업:** Exact cause & required action
9. **사용자 직접 작업:** Kakao/Supabase console config
10. **최종 판정:** COMPLETE / PARTIAL / BLOCKED

**Not COMPLETE without real OAuth + real DB verified.**

---

## 20. Immediate First Steps

1. **Verify existing code & backend state** → Save this spec to repo
2. **Then implement** following the phases above

**Core Principles Throughout:**
1. Don't unnecessarily rewrite working features
2. No per-page auth duplication
3. No fake success before real auth
4. User never restarts application after login
5. No demo data treated as real user data
6. Server verifies user data access rights
7. UI/UX verified in real browser, not just code review
8. No test skipping/avoidance
9. Clear separation: console config vs code implementation
10. Deploy and real auth verified independently

**End Goal:** User visits PartyConnect, signs up with Kakao, applies to party, logs in on another device, sees their application history correctly.