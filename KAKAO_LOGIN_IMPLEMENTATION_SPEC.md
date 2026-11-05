# P0 실행 명세: 카카오 실제 로그인 구현

> **우선순위:** P0 / 오늘 최우선 작업
> **목표일:** 2026-11-05 (한국시간)
> **대상:** PartyConnect MVP
> **저장소:** https://github.com/J-Hype-Labs/party-connect-mvp
> **운영 URL:** https://j-hype-labs.github.io/party-connect-mvp/
> **DB 담당:** 이제호가 구축 및 선택 중인 DB/인증 기반. 구현 에이전트는 제호의 결정과 산출물을 우선 사용한다.
> **범위:** 카카오 OAuth 실제 로그인 + 서비스 로그인 상태 유지 + 로그아웃 + 네이버 로그인 제거
> **주의:** 이 문서는 구현 지시서다. 코드가 수정되고 운영 환경에서 검증되기 전까지 완료로 표시하지 않는다.

---

## 0. 이 문서의 우선순위와 작업 원칙

이 문서는 기존 인증·백엔드 일반 설계보다 카카오 로그인 실행 작업에서 우선한다.

### 반드시 달성할 결과

사용자가 운영 URL에서 '카카오로 계속하기'를 누르면 다음 흐름이 실제로 성립해야 한다.

1. 실제 카카오 인증 및 동의 화면이 열린다.
2. 사용자가 카카오 계정으로 인증하고 동의한다.
3. 카카오가 승인된 OAuth callback으로 인가 코드를 전달한다.
4. 인증 서비스가 코드를 안전하게 처리하고 실제 카카오 사용자 식별정보를 확인한다.
5. 서비스 Auth DB에 해당 사용자가 생성되거나 기존 사용자로 식별된다.
6. 브라우저가 실제 서비스 로그인 세션을 얻는다.
7. 사용자는 로그인 상태의 헤더/계정 메뉴를 확인할 수 있다.
8. 새로고침 후에도 인증 SDK를 통해 세션이 복원된다.
9. 계정 메뉴에서 로그아웃하면 실제 서비스 세션이 종료된다.
10. 다시 로그인하면 새로운 임의 ID가 아니라 동일한 Auth 사용자로 인식된다.

**버튼 클릭, 모달 닫힘, 토스트, 임의 사용자 객체 생성, localStorage에 임의 객체 저장은 로그인 성공이 아니다.**

### 제품 범위 확정

- 카카오 로그인: 구현 대상.
- 네이버 로그인: 제거 대상. 이번 버전에서 구현하지 않는다.
- 이메일 로그인: 이번 당일 목표에서 제외. 실제 인증이 없다면 '준비 중'으로 표시하고 성공처럼 동작시키지 않는다.
- 카카오맵 링크: 지도 기능이므로 유지한다. 네이버 로그인 제거를 이유로 지도·일반 문구까지 삭제하지 않는다.
- 기존 파티·신청·후기·찜·관리자 UI: 인증 작업과 무관한 기능을 임의로 삭제하거나 전면 교체하지 않는다.

---

## 1. 현재 코드 상태와 반드시 재확인할 부분

기준으로 확인한 main:index.html에서는 다음 구현이 존재했다. 작업 시작 시 최신 main 및 진행 중 PR을 다시 확인하고, 코드가 이미 바뀌었다면 실제 상태를 우선한다.

| 위치/함수 | 기존 동작 | 이번 작업 |
|---|---|---|
| handleSocialLogin(provider) | Date.now() 기반 임의 ID, 고정 표시명, provider 값으로 mock user 생성 | 실제 Kakao Auth 호출로 대체 |
| 로그인 모달의 카카오 버튼 | mock 함수 호출 | 실제 OAuth 시작 |
| 로그인 모달의 네이버 버튼 | handleSocialLogin('naver') 호출 | 버튼과 관련 분기 삭제 |
| loginMethod state | kakao/naver/email 주석 및 분기 | 실제 사용 범위를 확인해 kakao/email만 남기거나 불필요하면 단순화 |
| currentUser 초기화 | partyconnect:user localStorage JSON 복원 | Auth SDK 세션으로 복원 |
| currentUser 저장 effect | 사용자 객체를 partyconnect:user에 저장 | 임의 사용자 객체 저장 제거 |
| handleLogout() | localStorage key 삭제 후 로그아웃 토스트 | 실제 Auth SDK signOut 후 상태 갱신 |
| 마이페이지 설정 | 로그아웃 버튼만 존재 | 기존 버튼을 실제 로그아웃에 연결하고 로그인 상태에서 쉽게 찾을 수 있게 노출 |

주의: 현재 코드에 관리자 비밀번호가 공개 프론트엔드에 하드코딩된 별도 보안 문제가 확인되어 있다. 이는 별도 P0 보안 티켓으로 기록하고, 이번 카카오 로그인 구현 중 무단으로 관리자 기능 전체를 리팩터링하지 않는다. 실제 고객 개인정보나 운영 데이터는 보안 조치 전까지 입력하지 않는다.

---

## 2. 구현 시작 전 필수 사전 점검

무료 모델은 코드를 수정하기 전에 아래 절차를 순서대로 실행한다.

### 2.1 GitHub 및 작업자 충돌 점검

1. git status --short로 변경사항을 확인한다.
2. 현재 브랜치와 최신 origin/main을 확인한다.
3. 최근 커밋 10개, 열린 PR, 진행 중 작업 브랜치를 확인한다.
4. index.html, package.json, package-lock.json, .github/workflows/ci.yml, Playwright 설정 및 테스트 파일을 확인한다.
5. 기존 구현 작업자가 수정 중인 파일을 덮어쓰지 않는다.
6. 같은 파일에 미커밋 변경이 있으면 먼저 변경 내용을 읽고 충돌을 피한다.
7. 인증 구현은 별도 브랜치/작은 PR로 진행한다. main 직접 수정은 저장소의 기존 규칙이 명확히 허용하는 경우에만 한다.

### 2.2 저장소 전체 검색

다음 키워드로 전체 저장소를 검색한다.

- handleSocialLogin
- handleLogout
- currentUser
- partyconnect:user
- kakao
- naver
- mockUser
- 로그인 완료
- @supabase/supabase-js
- createClient
- signInWithOAuth
- signOut

검색 결과를 바탕으로 실제 인증 구현 여부를 확인한다. 문서에만 적힌 기술을 이미 구현된 것으로 간주하지 않는다.

### 2.3 제호의 DB 구축 상태 확인

DB 전체 구축은 제호에게 위임되어 있다. 에이전트는 새 Supabase/Firebase/DB 프로젝트를 임의로 만들지 않는다.

먼저 다음을 확인한다.

- DB/인증 플랫폼이 무엇으로 결정되었는가?
- 프로젝트가 실제로 생성되었는가?
- Auth Provider 설정을 지원하는가?
- 카카오 OAuth를 플랫폼에서 직접 지원하는가?
- 서비스 사용자 테이블 또는 profiles 테이블의 이름과 컬럼은 무엇인가?
- Auth 사용자와 서비스 프로필을 연결하는 키는 무엇인가?
- RLS 또는 서버 권한 정책은 설정되었는가?
- 테스트/운영 환경이 분리되어 있는가?

#### 제호에게 받아야 할 연동 계약

| 항목 | 필요 정보 | 전달 방법 |
|---|---|---|
| 인증/DB 공급자 | Supabase 또는 제호가 선택한 플랫폼 | Notion/GitHub 문서로 명시 |
| 프로젝트 URL | 공개 가능한 Auth/DB endpoint | 비밀값이 아닌 설정값으로 전달 |
| 공개 클라이언트 키 | Supabase Publishable Key 또는 anon key 등 | 공개 가능 키인지 확인 후 전달 |
| Kakao Provider callback | 인증 공급자가 발급한 정확한 callback URL | 문자열 그대로 전달 |
| Kakao REST API Key | 카카오 앱 Client ID | 인증 대시보드에 설정 |
| Kakao Client Secret | 카카오 앱 Client Secret | 채팅·GitHub에 붙이지 말고 인증 대시보드의 비밀 설정에 직접 입력 |
| 프로필 스키마 | auth user와 연결할 테이블/컬럼 | DDL 또는 스키마 문서 |
| 사용자 생성 방식 | DB trigger 또는 서버 upsert | 한 가지 방식으로 합의 |
| 접근 정책 | 사용자 본인 데이터 조회/수정 RLS 또는 API 권한 | 테스트 결과 포함 |

비밀값은 ChatGPT 메시지, GitHub Issue/PR, 소스코드, 테스트 로그, README에 복사하지 않는다. 제호가 대시보드에 직접 등록하고, 에이전트는 설정 완료 여부만 확인한다.

### 2.4 선행 조건 미충족 시

필수 프로젝트 URL/공개 키/Provider 설정/DB 계약이 없다면 다음 행동만 한다.

1. 이미 준비된 프론트엔드 부분 중 비밀값 없는 작업만 진행한다.
2. 누락된 설정을 정확한 이름과 담당자(제호/김주형)로 목록화한다.
3. 가짜 로그인으로 대체하지 않는다.
4. 실제 인증이 되지 않았는데 완료로 보고하지 않는다.
5. 다른 DB 프로젝트나 OAuth Provider를 무단으로 새로 만들지 않는다.

---

## 3. 권장 구현 경로: 제호가 Supabase를 구축한 경우

Supabase는 Kakao Auth Provider를 공식 지원한다. 현재 프로젝트가 GitHub Pages의 정적 React UMD 페이지이므로, 전체 프레임워크를 Vite/Next.js로 전환하지 않고 Supabase JS SDK를 사용해 우선 구현한다.

공식 문서:
- Supabase Kakao Auth: https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao
- Supabase JS 설치/CDN: https://supabase.com/docs/reference/javascript/installing
- Supabase signInWithOAuth: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Kakao Developers REST API: https://developers.kakao.com/docs/ko/kakaologin/rest-api

### 3.1 인증 흐름 구조

    PartyConnect (GitHub Pages)
      |
      | 1. signInWithOAuth(provider: kakao)
      v
    Supabase Auth
      |
      | 2. Kakao authorization endpoint로 이동
      v
    Kakao Login / Consent
      |
      | 3. authorization code 전달
      v
    Supabase Auth callback
      |
      | 4. Kakao token exchange + user info 처리
      v
    Supabase Auth user 생성/조회
      |
      | 5. Supabase가 앱의 redirectTo로 이동
      v
    PartyConnect (GitHub Pages)
      |
      | 6. Supabase JS SDK가 callback URL의 인증 결과를 처리하고 세션 복원
      v
    로그인 상태 UI

이 경로에서는 Kakao Client Secret을 Supabase Auth 설정에 저장한다. 브라우저 코드가 Kakao token endpoint에 직접 Client Secret을 보내는 구현을 만들지 않는다.

### 3.2 Kakao Developers 설정

카카오 개발자 콘솔에서 기존 앱이 있는지 먼저 확인한다. 이미 제호 또는 조직 소유 앱이 있다면 중복 앱을 생성하지 않는다.

1. https://developers.kakao.com 접속.
2. PartyConnect용 애플리케이션 선택 또는 승인된 앱 생성.
3. 앱의 Web 플랫폼에 서비스 도메인을 등록한다.
   - 현재 사이트 origin: https://j-hype-labs.github.io
   - URL path /party-connect-mvp/는 Web 플랫폼 도메인과 혼동하지 않는다.
4. Kakao Login 사용 설정을 ON으로 활성화한다.
5. REST API Key를 확인한다. Supabase 설정에서 Client ID로 사용한다.
6. Kakao Login Client Secret을 생성하고 활성화한다. Supabase 설정에서 Client Secret으로 사용한다.
7. 동의항목은 필요한 최소 범위로 설정한다.
   - profile_nickname: 사용자 표시명에 필요. 가능한 경우 필수 동의.
   - profile_image: 프로필 이미지가 필요할 때만 선택 동의.
   - account_email: 이메일이 이번 로그인에 필수는 아니므로 선택 동의. 이메일이 없다는 이유로 로그인을 실패시키지 않는다.
8. Supabase Dashboard에서 발급한 callback URL을 Kakao Login Redirect URI에 문자 그대로 정확히 등록한다.

Supabase callback URI의 일반 형식:

    https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback

위 주소는 형식 예시다. 실제 프로젝트의 Supabase Dashboard에서 복사한 callback URL만 사용한다. project ref를 추측해 만들지 않는다.

### 3.3 Supabase Dashboard 설정

1. 제호가 소유/관리하는 실제 Supabase 프로젝트에 접속한다.
2. Authentication → Sign In / Providers → Kakao로 이동한다.
3. Kakao Provider를 Enabled로 켠다.
4. Client ID에 Kakao REST API Key를 입력한다.
5. Client Secret에 Kakao Login Client Secret을 입력한다.
6. 이메일 동의를 받지 않기로 했다면 Supabase Kakao Provider의 'Allow users without an email' 설정을 확인하고 허용한다.
7. Authentication → URL Configuration으로 이동한다.
8. Site URL을 현재 운영 앱의 정확한 URL로 설정한다.

    https://j-hype-labs.github.io/party-connect-mvp/

9. Redirect URLs allow list에 위 운영 URL을 정확히 등록한다.
10. 로컬 테스트를 할 경우 실제 사용하는 로컬 주소도 별도 허용한다. 예: http://localhost:3000/.
11. Kakao callback URL과 Supabase의 앱 redirect URL이 서로 다른 주소라는 점을 확인한다.

주소 구분은 반드시 지킨다.

| 용도 | 주소 |
|---|---|
| Kakao Developers에 등록하는 Redirect URI | Supabase Dashboard가 제공한 https://<project-ref>.supabase.co/auth/v1/callback |
| Supabase Auth가 로그인 후 돌려보낼 앱 URL | https://j-hype-labs.github.io/party-connect-mvp/ |
| Kakao Web 플랫폼 도메인 | https://j-hype-labs.github.io |

Kakao Redirect URI에 GitHub Pages 주소를 넣거나, Supabase 앱 redirect allow list에 Kakao callback을 넣는 식으로 서로 뒤바꾸지 않는다.

### 3.4 프론트엔드 SDK 추가

현재 프로젝트 구조를 먼저 확인한다. 현재 React UMD + Babel Standalone 구조를 유지하는 경우 Supabase JS UMD CDN을 사용할 수 있다.

공식 CDN 설치 문서:
https://supabase.com/docs/reference/javascript/installing

요구사항:

- @supabase/supabase-js는 v2를 사용한다.
- CDN을 사용할 경우 테스트한 정확한 버전을 고정한다. @2처럼 버전이 계속 바뀌는 floating URL을 최종 운영 코드에 그대로 두지 않는다.
- SDK script는 앱의 Babel JSX script보다 먼저 로드한다.
- 브라우저에서 window.supabase.createClient 또는 CDN이 제공하는 실제 global API를 확인한다.
- CDN 로드 실패 시 로그인 버튼이 가짜 성공으로 진행되지 않도록 한다.
- 기존 외부 CDN 검증 스크립트에 Supabase SDK 의존성 검증을 추가한다.
- 이미 프로젝트에서 npm 번들링 구조를 사용하도록 변경되었다면 CDN을 중복 추가하지 말고 기존 패키지 import 방식에 맞춘다.

### 3.5 공개 설정값

GitHub Pages는 정적 사이트다. 브라우저로 전달되는 값은 모두 공개된다고 간주한다.

프론트엔드에 허용되는 값:
- Supabase Project URL
- Supabase Publishable Key 또는 구형 anon public key

프론트엔드에 절대 포함하면 안 되는 값:
- Kakao Client Secret
- Supabase service_role key
- DB password
- 서버용 secret
- 개인 access/refresh token을 고정값으로 저장한 것

Publishable/anon key는 공개 키지만, RLS가 적용되지 않은 테이블에 사용하면 안 된다. 공개 키가 비밀이 아니라는 사실은 데이터베이스가 공개되어도 된다는 뜻이 아니다.

설정값은 현재 프로젝트의 환경설정 패턴을 확인한 후 한 곳에서 관리한다. 프로젝트 URL과 공개 키가 아직 없으면 임의의 값을 만들지 말고 설정 누락으로 보고한다.

### 3.6 Supabase client 초기화

- 앱 전체에서 단일 Supabase client 인스턴스를 사용한다.
- React 컴포넌트가 렌더링될 때마다 client를 새로 생성하지 않는다.
- flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true 설정을 명시적으로 검토한다.
- SDK가 URL의 OAuth 결과를 처리하기 전에 자체적으로 중복 로그인 처리/중복 callback 처리를 하지 않는다.
- getSession()으로 초기 세션을 확인하고 onAuthStateChange()로 INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED 상태를 구독한다.
- 컴포넌트 언마운트 또는 앱 정리 시 Auth state listener subscription을 해제한다.
- OAuth callback query parameter를 처리한 뒤 URL에 남은 불필요한 인증 코드/상태를 정리할 수 있는지 확인한다. 세션 교환 전에 query를 임의로 제거하지 않는다.

참고: Supabase JS의 브라우저 SPA 모드는 SDK가 브라우저 세션 저장소를 관리한다. 이를 서버의 HttpOnly cookie 세션과 동일하다고 표현하지 않는다. HttpOnly cookie 기반 SSR 세션이 필요하면 별도 서버/SSR 아키텍처가 필요하다. 오늘의 GitHub Pages MVP 구현에서는 SDK 세션 관리와 RLS를 적용하고, 별도 서버 세션 전환은 별도 승인된 작업으로 분리한다.

### 3.7 카카오 로그인 버튼 구현

카카오 버튼의 실제 동작:

1. 클릭 시 중복 클릭을 막기 위해 loading state를 켠다.
2. Supabase client가 준비되었는지 확인한다.
3. 설정값이 없거나 Provider가 연결되지 않았으면 실제 로그인 성공으로 처리하지 않고 오류를 표시한다.
4. supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: APP_REDIRECT_URL } }) 형태의 SDK API를 사용한다.
5. SDK가 생성한 실제 인증 URL로 브라우저가 이동하도록 한다.
6. 오류가 반환되면 loading state를 해제하고 사용자에게 이해 가능한 안내를 표시한다.
7. OAuth가 시작되기 전에 '로그인 완료' 토스트를 띄우지 않는다.

APP_REDIRECT_URL은 현재 GitHub Pages 프로젝트 경로를 포함해야 한다.

    https://j-hype-labs.github.io/party-connect-mvp/

https://j-hype-labs.github.io/로 잘못 redirect하면 저장소 경로를 벗어나므로 주의한다.

### 3.8 로그인 상태 및 사용자 프로필

- 인증의 기준은 Supabase Auth의 실제 session.user다.
- 임의 ID, Date.now(), 고정 가짜 이름, provider만 표시한 mock object를 사용자 인증으로 사용하지 않는다.
- canonical user ID는 auth.users.id에 해당하는 Auth user UUID다.
- Kakao provider의 안정적인 고유 ID/provider identity를 사용한다. 이메일 주소를 계정 고유키로 쓰거나 이메일만으로 자동 계정 병합하지 않는다.
- 프로필 표시명은 동의받아 반환된 Kakao nickname 또는 제호의 profiles 스키마에 정의된 필드에서 읽는다.
- 프로필 이미지가 없거나 동의하지 않은 경우 빈 이미지/기본 아바타를 사용한다. 가짜 사용자 정보로 채우지 않는다.
- 이메일이 없을 수 있다. 이메일을 필수 사용자 필드로 가정하지 않는다.
- Supabase Auth가 최초 로그인 시 Auth user를 생성하는지 Dashboard에서 확인한다.
- 앱 프로필 테이블 생성은 제호가 담당하는 DB 스키마와 합의한다. 이미 trigger가 있다면 프론트엔드에서 중복 insert하지 않는다.
- profiles 테이블이 아직 없으면 새 테이블을 임의 생성하지 말고 제호의 스키마 계약을 요청한다. 인증 자체와 프로필 상세 저장을 분리해 현재 blocker를 정확히 보고한다.

### 3.9 로그아웃 구현

- 기존 handleLogout의 localStorage key 삭제만으로 끝내지 않는다.
- await supabase.auth.signOut()을 실행한다.
- 에러가 있으면 로그인 상태를 성공적으로 종료했다고 표시하지 않는다.
- 정상 로그아웃 후 Auth state listener의 SIGNED_OUT 상태로 사용자 UI를 갱신한다.
- 앱 내부의 currentUser 및 사용자 전용 UI를 초기화한다.
- 기존 partyconnect:user는 과거 mock 로그인 잔여 키이므로 1회 정리한다.
- localStorage.clear()로 앱 전체 데이터/환경설정을 지우지 않는다.
- 로그아웃 토스트는 signOut 성공 후에만 표시한다.
- 로그아웃 버튼은 사용자가 쉽게 찾을 수 있는 계정 메뉴/마이페이지에 유지한다. 이번 작업에서 기존 UI를 불필요하게 다시 디자인하지 않는다.
- 로그아웃 후 뒤로 가기 또는 새로고침으로 로그인 사용자 UI가 다시 나타나지 않는지 확인한다.

---

## 4. 제호가 Supabase가 아닌 별도 인증/DB를 선택한 경우

Supabase를 새로 만들거나 이중 DB를 구축하지 않는다. 제호가 만든 backend의 기존 계약을 사용한다.

최소 API 계약은 아래와 같아야 한다(실제 route 이름은 제호의 서버 구현과 협의 후 확정).

| API | 역할 | 성공 조건 |
|---|---|---|
| GET /auth/kakao/start | state 생성 후 Kakao 인증 URL로 redirect | state가 세션과 연결됨 |
| GET /auth/kakao/callback | code/state 검증, 서버 측 token exchange 및 사용자 조회 | 검증된 사용자 식별 |
| GET /api/me | 현재 서비스 로그인 사용자 반환 | 서버 세션 검증 |
| POST /api/logout | 서버 세션 종료 | 세션 무효화 |
| GET /health | 인증 서버 상태 확인(선택) | 서비스 가용성 확인 |

필수 서버 동작:

1. 서버가 충분히 긴 난수 state를 생성하고 로그인 세션/서버 저장소에 묶는다.
2. Kakao authorization code callback에서 state 일치 여부를 검증한다.
3. 서버가 Kakao token endpoint에 code를 교환한다.
4. Kakao Client Secret은 서버 secret manager/environment variable에서만 읽는다.
5. 서버가 https://kapi.kakao.com/v2/user/me를 호출해 provider user ID와 동의된 최소 프로필을 얻는다.
6. provider + provider user ID로 DB에서 사용자를 조회/생성한다.
7. 서비스 세션을 안전한 cookie로 발급한다. Secure, HttpOnly, SameSite 설정 및 CSRF 방어를 검토한다.
8. 브라우저는 Kakao access/refresh token을 직접 보관하지 않는다.
9. logout endpoint에서 서버 세션을 무효화한다.
10. CORS는 운영 origin https://j-hype-labs.github.io 및 승인된 로컬 origin만 허용한다. credentials 사용 시 *를 사용하지 않는다.

제호의 backend route와 응답 schema가 다르면 새 endpoint를 임의로 추가하지 말고 계약을 먼저 맞춘다.

---

## 5. 네이버 로그인 완전 제거 지시

다음은 인증 관련 코드만 제거한다. 지도 기능 등 다른 네이버 관련 코드가 있다면 별도 검토한다.

1. 로그인 모달의 네이버 로그인 버튼 제거.
2. handleSocialLogin('naver') 호출 제거.
3. mock handler의 provider === 'naver' 분기 제거.
4. provider state/type/comment에서 naver 제거.
5. 네이버 로그인 전용 아이콘, 문구, 안내, 성공 토스트 제거.
6. 네이버 로그인 전용 test fixture 및 Playwright 테스트 제거.
7. README와 SPECIFICATION의 지원 provider 목록 수정.
8. 사용자에게 네이버 로그인도 가능한 것처럼 보이는 UI가 남지 않게 확인.
9. 전체 검색 결과에서 인증 관련 naver 참조가 0개인지 확인한다. 단, 제거 이력을 설명하는 문서의 '네이버 로그인 제외' 문구는 남겨도 된다.
10. 카카오맵 버튼과 링크는 절대 제거하지 않는다.

---

## 6. mock 로그인 완전 제거

다음 패턴은 인증 성공으로 남아 있으면 안 된다.

- const mockUser = ...
- id: user_${Date.now()}
- provider 이름만 보고 '카카오 로그인 완료' 토스트를 표시하는 코드
- 실제 인증 결과 없이 setCurrentUser(mockUser)
- 실제 Auth session 없이 localStorage.setItem('partyconnect:user', ...)
- 로그인 오류가 발생했는데도 사용자 상태를 변경하는 fallback

기존 UI에서 인증 설정이 아직 제공되지 않는 경우:
- 버튼을 비활성화하거나,
- 클릭 시 '카카오 로그인 설정이 완료되지 않았습니다. 운영자에게 문의해 주세요.'와 같이 명확한 오류를 표시한다.
- 임의 사용자를 만들거나 성공 화면을 보여주지 않는다.

기존 localStorage 초기화 코드는 전체 저장 데이터를 삭제하지 않도록 주의한다. 사용자 인증용 구형 키만 제거한다.

---

## 7. 사용자 화면 요구사항

### 비로그인 상태

- 로그인 모달에 카카오 로그인 버튼 하나만 노출한다.
- 네이버 로그인 버튼은 보이지 않는다.
- 이메일 로그인은 실제 구현하지 않았다면 '준비 중'으로 분명히 표시하거나 제거한다.
- 버튼 텍스트는 '카카오로 계속하기'로 유지한다.
- 로딩 중에는 중복 클릭을 막고 버튼에 진행 상태를 표시한다.

### 로그인 진행 중

- 사용자가 카카오 인증 페이지로 실제 이동해야 한다.
- 앱에서 임의로 로그인 완료 화면을 먼저 표시하지 않는다.
- 사용자가 동의를 취소하거나 브라우저에서 돌아오면 로그인되지 않은 상태를 유지하고 적절한 안내를 표시한다.

### 로그인 성공

- 헤더/계정 메뉴에 실제 Kakao nickname 또는 DB profile name 표시.
- 프로필 이미지가 반환되면 표시하고, 없으면 기본 아바타.
- 로그인 모달은 닫힌다.
- 로그인 완료 토스트는 Auth session이 확인된 후에만 표시한다.
- 새로고침 후에도 동일 Auth user ID로 세션이 복원된다.
- 마이페이지는 현재 Auth user 기준으로 렌더링한다.

### 로그아웃

- 사용자가 계정 메뉴에서 로그아웃을 찾을 수 있다.
- 서버/Auth SDK 로그아웃 성공 후 비로그인 UI로 전환한다.
- 새로고침/뒤로 가기 후에도 로그아웃 상태를 유지한다.

### 오류 상태

다음 상황을 구분해 사용자에게 알린다.

- Kakao 동의 취소
- Kakao 인증 거절/앱 설정 오류
- redirect URI 불일치
- Supabase Provider 비활성화
- callback code 교환 실패
- 이메일이 제공되지 않음
- 네트워크 오류
- 세션 조회/갱신 실패
- 로그아웃 실패
- SDK CDN 로드 실패
- 환경 설정값 누락

오류 세부 정보는 개발 로그에 남기되 access token, refresh token, client secret, 개인정보를 출력하지 않는다.

---

## 8. DB 연동 및 제호와의 인터페이스

DB 구축은 제호가 담당하므로 로그인 구현자는 스키마를 독자적으로 확정하지 않는다.

### 8.1 최소 데이터 관계

Supabase를 쓰는 경우 기본 구조는 다음과 같다.

    auth.users
      id (uuid, primary key)
      app_metadata.provider = kakao
      identities (Kakao provider identity)

    profiles (제호가 구축/승인)
      id -> auth.users.id (uuid, primary key / foreign key)
      display_name
      avatar_url (nullable)
      created_at
      updated_at

실제 profiles 컬럼명이 다르면 제호의 스키마에 맞춘다. 중복 사용자 테이블이나 별도 provider ID 테이블을 임의로 만들지 않는다.

### 8.2 최소 RLS 기준

- 일반 사용자는 자신의 profile만 조회할 수 있어야 한다.
- 일반 사용자는 자신의 허용된 profile 필드만 수정할 수 있어야 한다.
- 일반 사용자는 다른 사용자의 profile을 수정할 수 없어야 한다.
- user ID는 클라이언트가 임의로 지정한 값이 아니라 인증된 auth.uid()와 비교해야 한다.
- 관리자 권한은 프론트엔드 boolean으로 부여하지 않는다.
- RLS가 확인되지 않은 민감 테이블은 프론트엔드에서 조회하지 않는다.

### 8.3 계정 식별 정책

- canonical ID: Supabase auth.users.id 또는 제호 backend의 내부 user UUID.
- provider ID: Kakao가 발급한 안정적인 사용자 식별자.
- email: 제공되지 않을 수 있고 변경될 수 있으므로 기본 고유키로 사용하지 않는다.
- 닉네임: 변경 가능하므로 고유키로 사용하지 않는다.
- 기존 mock user ID와 실제 Auth user ID를 자동 병합하지 않는다.
- 기존 localStorage mock 사용자 데이터는 운영 계정으로 승격하지 않는다.

---

## 9. 테스트 및 검증 기준

테스트 결과를 부풀리지 않는다. 자동화 테스트와 실제 Kakao 계정 수동 검증을 별도로 보고한다.

### 9.1 정적/코드 검증

- JSX 문법 검사 통과.
- 기존 HTML 구조 검사 통과.
- Supabase SDK script 또는 package가 정확히 로드되는지 검사.
- 공개 파일에 Client Secret/service_role key가 없는지 검사.
- Naver 로그인 버튼·handler·provider branch가 없는지 검사.
- mockUser/Date.now 기반 mock auth가 로그인 경로에 남아 있지 않은지 검사.
- 실제 Auth 설정이 없는 경우 fake fallback이 없는지 검사.
- partyconnect:user 저장·복원 로직이 로그인 source of truth로 남아 있지 않은지 검사.
- 기존 비인증 기능의 회귀 테스트 통과.

### 9.2 Playwright 자동 테스트

자동 테스트는 실제 카카오 계정 비밀번호를 저장하거나 자동 로그인하지 않는다. CI는 아래 UI/redirect contract를 검증한다.

1. 로그인 모달에 카카오 버튼이 정확히 하나 존재한다.
2. 네이버 로그인 버튼은 존재하지 않는다.
3. 카카오 버튼을 누르면 Supabase Auth의 Kakao OAuth 시작 URL로 이동한다.
4. redirect URL에 현재 GitHub Pages 프로젝트 경로가 포함된다.
5. SDK/설정 오류가 있으면 로그인 성공 상태가 되지 않는다.
6. 로그인 상태 fixture 테스트는 UI 상태 동작만 검증하며 실제 OAuth 완료 증거로 기록하지 않는다.
7. 로그아웃 호출 시 Auth SDK signOut이 실행되고 상태가 초기화된다.
8. 로그인/로그아웃 후 헤더 계정 메뉴가 올바르게 바뀐다.
9. 390px 모바일과 데스크톱에서 로그인 모달이 겹치거나 가로 넘침이 발생하지 않는다.
10. 기존 신청·파티 상세·필터·모달 E2E가 회귀하지 않는다.

테스트에서 Kakao callback을 mock했다면 테스트 이름과 보고서에 'mock OAuth UI test'라고 표시한다. 실제 Kakao 인증 성공이라고 보고하지 않는다.

### 9.3 실제 계정 수동 검증 (필수)

실제 테스트용 Kakao 계정으로 운영 URL에서 아래를 확인한다.

- [ ] 실제 Kakao 로그인/동의 화면이 표시된다.
- [ ] 동의 후 운영 URL로 정상 복귀한다.
- [ ] Supabase Auth 또는 제호 backend에 실제 Kakao provider user가 생성된다.
- [ ] 앱에 실제 닉네임이 표시된다.
- [ ] 이메일 제공을 거부하거나 이메일이 없는 경우에도 정책에 따라 로그인 가능하다.
- [ ] 새로고침 후 로그인 상태가 유지된다.
- [ ] 같은 Kakao 계정으로 재로그인하면 동일 Auth user ID가 사용된다.
- [ ] 로그아웃 후 비로그인 상태가 된다.
- [ ] 로그아웃 후 새로고침/뒤로 가기에서도 로그인 상태가 되살아나지 않는다.
- [ ] 모바일 브라우저에서도 정상 동작한다.
- [ ] Kakao 동의 취소 시 로그인되지 않고 오류 안내가 나온다.

실제 카카오 계정 테스트를 수행하지 못했다면 이 항목은 미검증이다.

### 9.4 보안 검증

- [ ] Kakao Client Secret이 GitHub 코드/Actions artifact/Pages HTML에 없다.
- [ ] Supabase service_role key가 프론트엔드에 없다.
- [ ] Supabase RLS가 사용자 데이터 테이블에 적용되어 있다.
- [ ] 사용자 A가 사용자 B의 profile을 조회/수정할 수 없다.
- [ ] provider token을 임의로 localStorage에 복사해 저장하지 않는다.
- [ ] OAuth callback/redirect URL이 allow list에 제한된다.
- [ ] 로그에 토큰/비밀번호/민감정보가 없다.

---

## 10. CI 및 배포 절차

1. 기능 구현 브랜치에서 정적 검사와 Playwright를 실행한다.
2. 실패가 있으면 테스트를 skip하거나 assertion을 약화하지 말고 원인을 수정한다.
3. PR에 변경 범위, DB 의존성, Kakao 설정 필요사항을 명시한다.
4. CI Validate → E2E → Deploy-Check가 통과해야 한다.
5. Pages 배포가 같은 커밋 SHA를 반영했는지 확인한다.
6. 운영 URL에서 실제 Kakao 로그인 수동 검증을 수행한다.
7. 배포 후 실패하면 이전 안정 버전으로 rollback 가능한 상태를 유지한다.

GitHub Pages는 정적 호스팅이므로 프론트엔드 코드에 서버 비밀값을 넣지 않는다. Supabase Project URL/Publishable Key는 공개용으로만 사용하고 RLS를 적용한다.

---

## 11. 오늘의 작업 순서 및 우선순위

| 순서 | 작업 | 책임/의존성 | 완료 조건 |
|---|---|---|---|
| 1 | 최신 코드·PR·DB 플랫폼 확인 | 개발 에이전트 | 기존 작업 충돌 여부 및 인증 경로 확인 |
| 2 | 제호 DB/인증 설정 계약 확인 | 제호 → 개발 에이전트 | 플랫폼, URL, 공개 키, callback, profile schema 확인 |
| 3 | Kakao 앱 및 Supabase Provider 설정 | 제호 또는 승인된 담당자 | Kakao Client ID/Secret이 인증 대시보드에 안전하게 등록 |
| 4 | Supabase SDK 및 설정 연결 | 개발 에이전트 | client 1개 생성, config 로드 확인 |
| 5 | mock 로그인 제거 및 Kakao OAuth 연결 | 개발 에이전트 | 실제 Kakao 인증 시작 |
| 6 | Auth session 상태 연결 | 개발 에이전트 | 새로고침/세션 복원 |
| 7 | 로그아웃 연결 및 네이버 제거 | 개발 에이전트 | 실제 signOut, Naver UI/handler 0 |
| 8 | 자동 테스트/CI | 개발 에이전트 | 기존 회귀 + 신규 인증 contract test PASS |
| 9 | 운영 배포 및 실계정 테스트 | 개발 에이전트 + 테스트 계정 소유자 | 실제 로그인/로그아웃 확인 |

### 작업 중 우선순위

- 제호의 DB 전체 테이블 구축 완료를 기다리지 않는다. Auth 기반과 최소 user/profile 계약이 준비되면 병렬 진행한다.
- DB 플랫폼이 아직 미정이면 먼저 제호에게 확인한다. Supabase로 이미 결정되어 있다면 위 Supabase 절차를 그대로 사용한다.
- Kakao Client Secret이 없는 상태에서 직접 token exchange 코드를 만들거나 브라우저에 secret을 넣어 우회하지 않는다.
- 운영 OAuth 설정이 끝나지 않았으면 '실제 로그인 구현 완료'로 보고하지 않는다.
- 기존 UI 전체 교체, Vite 전환, 관리자 CRUD 재작성, 파티/신청/후기 백엔드화는 오늘 목표에서 제외한다.

---

## 12. 최종 완료 판정

### A. 오늘의 최소 성공 (실제 로그인 구현)

다음 항목 모두 만족해야 한다.

1. Kakao 실제 인증 화면 진입.
2. 실제 동의 후 앱으로 callback.
3. Auth user가 실제로 생성/조회.
4. 로그인 상태 UI 표시.
5. 새로고침 후 session restore.
6. 로그아웃 성공.
7. Naver 로그인 UI/handler 제거.
8. 운영 URL에서 테스트 계정으로 검증.

### B. 추가 운영 안정성

- 사용자 profile schema와 RLS 검증.
- 오류/취소/이메일 미제공 처리.
- mobile Safari/Chrome 검증.
- CI에서 인증 UI/redirect contract 테스트.
- secret scan 및 공개 프론트엔드 검사.

### C. 절대 완료로 보고하면 안 되는 상황

- 카카오 버튼만 새로 만들었음.
- 카카오 인증 URL로 이동하지 않고 mock user를 생성함.
- OAuth redirect까지만 확인하고 callback/세션을 확인하지 않음.
- 로컬 테스트만 통과하고 운영 URL을 확인하지 않음.
- CI의 mock test만 통과함.
- 실제 Kakao 계정으로 테스트하지 않았음.
- 로그인 성공 토스트만 표시됨.
- Supabase Auth user 생성 여부를 확인하지 못함.
- 로그아웃 UI만 추가하고 Auth SDK signOut은 호출하지 않음.

---

## 13. 에이전트의 최종 보고 형식 (ELI10)

아래 형식으로만 간결하고 사실대로 보고한다.

### 1. 실제로 구현한 것
- 카카오 OAuth 시작:
- callback:
- Auth user 생성/조회:
- 세션 복원:
- 로그아웃:
- 네이버 제거:

### 2. 검증
| 항목 | 결과 | 증거 |
|---|---|---|
| JSX/HTML | PASS/FAIL | Actions |
| Playwright UI/redirect | PASS/FAIL | 테스트명 |
| 실제 Kakao 인증 | PASS/미검증 | 수동 테스트 |
| DB/Auth user | PASS/미검증 | Dashboard/쿼리 |
| 세션 복원 | PASS/FAIL | 브라우저 테스트 |
| 로그아웃 | PASS/FAIL | 브라우저 테스트 |
| 보안 검사 | PASS/FAIL | secret scan/RLS |
| 운영 URL | PASS/FAIL | URL + SHA |

### 3. 막힌 사항
- 제호가 제공해야 하는 항목:
- 사용자/운영자가 설정해야 하는 항목:
- 기술적 장애:

### 4. 배포
- branch:
- commit SHA:
- PR:
- Actions:
- Pages deploy SHA:
- 운영 URL:

### 5. 완료 판정
다음 중 하나만 선택한다.
- **완료:** 실제 Kakao 계정으로 운영 URL 로그인과 로그아웃까지 검증.
- **부분 완료:** 실제 OAuth 일부 단계만 확인. 미완료 단계 명시.
- **차단:** DB/Provider 설정/비밀값 등 선행조건이 없어 실제 인증 불가.

'코드 작성 완료'와 '실제 로그인 완료'를 혼동하지 않는다.

---

## 14. 공식 참고자료

1. Supabase Kakao Auth: https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao
2. Supabase JS 설치 및 CDN: https://supabase.com/docs/reference/javascript/installing
3. Supabase signInWithOAuth: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
4. Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
5. Supabase JS 초기화 옵션: https://supabase.com/docs/reference/javascript/initializing
6. Kakao Login REST API: https://developers.kakao.com/docs/ko/kakaologin/rest-api
7. Kakao Login 구현 튜토리얼: https://developers.kakao.com/docs/ko/tutorial/login

문서 확인일: 2026-11-05.
