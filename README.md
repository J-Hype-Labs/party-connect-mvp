# Party Connect (파티커넥트) MVP

**상태: 프론트엔드 프로토타입 / 실서비스 인증·백엔드 미연동**

- 라이브 데모: https://j-hype-labs.github.io/party-connect-mvp/
- 저장소: https://github.com/J-Hype-Labs/party-connect-mvp
- 통합 개발 명세: [SPECIFICATION.md](./SPECIFICATION.md)
- 인증·백엔드 실서비스 전환 명세: [AUTHENTICATION_AND_BACKEND_SPEC.md](./AUTHENTICATION_AND_BACKEND_SPEC.md)

2030 오프라인 소셜링 파티 및 무료 체험단 매칭 서비스의 프론트엔드 MVP다. 현재 화면과 일부 상호작용은 브라우저 안에서 동작하지만, 실제 회원 인증·공용 데이터베이스·서버 권한 관리가 연결된 운영 서비스는 아니다.

## 현재 구현 범위

### 브라우저에서 동작하는 기능

- 파티 목록 및 샘플 데이터 표시
- 지역·요일·카테고리 필터링
- 파티 상세 모달과 신청 폼 입력 검증
- 신청 데이터를 현재 브라우저 상태와 `localStorage`에 저장하고 완료 화면 표시
- 찜, 알림, 후기 작성 등 일부 상호작용
- 관리자 화면의 파티·후기 관리 UI 및 브라우저 내 상태 변경
- 반응형 화면과 모달 상호작용

위 기능의 동작은 브라우저 로컬 범위다. 다른 사용자·브라우저·기기와 공유되는 서버 데이터가 아니며, 실제 운영 데이터의 저장·전송·동기화를 의미하지 않는다.

### 인증 및 백엔드 상태

| 기능 | 현재 상태 | 실서비스 판정 |
|---|---|---|
| 카카오 로그인 | 임의의 mock 사용자 생성 | 실제 OAuth 미연동 |
| 네이버 로그인 | 임의의 mock 사용자 생성 | 실제 OAuth 미연동 |
| 이메일 로그인 | 준비 중 안내만 표시 | 미구현 |
| 사용자 세션 | localStorage 사용자 객체 복원 | 서버 세션 미연동 |
| 로그아웃 | 마이페이지 설정에서 localStorage 상태 삭제 | 서버 세션 무효화 미연동 |
| 신청·찜·알림·후기 | 브라우저 상태 및 localStorage 중심 | 공용 DB 미연동 |
| 관리자 인증 | 클라이언트 코드에서 비밀번호 비교 | 안전한 서버 인증 아님 |
| 관리자 CRUD | 브라우저 상태 및 localStorage 변경 | 서버 DB CRUD 미연동 |
| 지도 | 주소 표시 및 외부 카카오맵 검색 링크 | 지도 SDK/API 미연동 |
| 방문 확인·정산 | 운영 정책 및 서버 처리 미구현 | 미구현 |

**보안 주의:** 공개된 프론트엔드 소스에 관리자 비밀번호가 하드코딩된 상태가 확인되었다. 해당 값은 유출된 것으로 간주하고 폐기해야 한다. 서버 측 인증·권한 관리가 완료되기 전까지 관리자 기능에 실제 운영 데이터나 고객 개인정보를 입력하지 않는다.

코드에 Supabase Storage 이미지 URL이 포함되어 있으나, 이는 이미지 자산 제공을 위한 URL이다. 앱의 Supabase Auth·DB 연동이 완료되었다는 뜻이 아니다.

현재 코드의 세부 감사, OAuth 요구사항, DB 후보 비교, 개인정보·보안 기준, 단계별 전환 계획은 [인증·백엔드 실서비스 전환 명세](./AUTHENTICATION_AND_BACKEND_SPEC.md)를 기준으로 한다.

## 기술 스택

- Frontend: React 18 UMD, ReactDOM, Tailwind CSS CDN, Babel Standalone, Lucide, Pretendard
- Hosting: GitHub Pages
- CI: GitHub Actions
- Browser tests: Playwright

## 로컬 실행

Python 정적 서버를 실행한다.

```bash
python3 -m http.server 3000
```

브라우저에서 `http://localhost:3000`으로 접속한다.

## 배포

`main` 브랜치 변경은 저장소의 GitHub Pages 배포 설정에 따라 반영된다.

- 운영 URL: https://j-hype-labs.github.io/party-connect-mvp/
- 정적 페이지 배포 성공은 OAuth·DB·서버 기능의 배포 또는 정상 동작을 의미하지 않는다.
- 배포 후에는 실제 브라우저에서 렌더링과 핵심 흐름을 별도로 검증한다.

## CI / E2E 검증 범위

GitHub Actions는 HTML/JSX 구조 및 브라우저 UI 흐름을 검사한다. Playwright의 PASS/FAIL/SKIP 수는 해당 실행의 실제 결과를 기준으로 보고한다.

테스트가 증명하는 것은 테스트가 직접 실행하고 검증한 프론트엔드 동작뿐이다. 현재 E2E 통과를 다음 기능의 완료 증거로 사용하지 않는다.

- 카카오·네이버 실제 OAuth 및 서버 세션
- 이메일 인증
- 서버 DB 저장 및 다른 기기 간 동기화
- 서버 측 관리자 인증 및 권한 검증
- 실제 개인정보의 안전한 수집·보관·삭제
- 실제 방문 확인, 후기 자격 검증 및 정산
- 운영 보안·백업·장애 복구

테스트 명령, CI 실행 ID, 커밋 SHA, 실제 PASS/FAIL/SKIP은 해당 GitHub Actions 실행 결과와 함께 기록한다. 오래된 실행 결과를 현재 코드의 검증 결과로 재사용하지 않는다.

## 개발 원칙

1. 기존 UI와 동작을 보존하면서 단계적으로 개선한다.
2. UI Only, Frontend Functional, Backend Integrated, Production Ready를 구분한다.
3. 실제 서버 연동이 없으면 '로그인 완료', '접수 완료', '저장 완료' 문구만으로 실서비스 기능이라고 보고하지 않는다.
4. 테스트에서 기능 부재를 조건부 skip 또는 우회로 감추지 않는다.
5. 비밀값은 공개 HTML/JS나 빌드 결과에 포함하지 않는다.
6. 실사용자 개인정보는 보안·동의·보관·파기 기준이 준비되기 전까지 수집하지 않는다.
7. 백엔드 기술 선택과 운영 정책은 대표 승인 후 진행한다.
