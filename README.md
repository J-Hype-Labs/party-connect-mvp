# HypeConnect

**운영 사이트:** https://j-hype-labs.github.io/party-connect-mvp/  
**파티 탐색 페이지:** https://j-hype-labs.github.io/party-connect-mvp/party-connect/  
**관리자 화면:** https://j-hype-labs.github.io/party-connect-mvp/admin/  
**서버 저장소:** https://github.com/J-Hype-Labs/partylink

HypeConnect는 혼술바·소셜링 파티 점주와 체험단 게스트를 연결하는 웹 서비스 MVP다. 이 저장소는 웹(사용자 화면 + 관리자 화면)이고, DB와 API는 `partylink` 저장소에 있다.

## 먼저 읽을 문서

**[SPECIFICATION.md](SPECIFICATION.md)** 하나가 제품 범위, 현재 상태, 업무 분담(Part A 서버·운영 / Part B 사용자 웹), 개발·동기화 규칙의 단일 기준이다. 상세 문서 목록은 [docs/README.md](docs/README.md)에 있다.

## 로컬 실행

Node.js 18 이상.

```bash
npm ci
python3 -m http.server 3000
```

- 메인: http://localhost:3000/ (기본은 데모 모드, 실서비스 연동은 `?live=1`)
- 파티 탐색: http://localhost:3000/party-connect/
- 관리자: http://localhost:3000/admin/

포트 3000을 다른 폴더의 서버가 이미 쓰고 있으면 테스트가 그 서버를 대상으로 돌아간다. 먼저 확인한다.

## 테스트

```bash
npm run validate:jsx
npm run validate:html
npm run test:e2e:full
npx playwright test tests/admin-page.spec.js tests/admin-catalog.spec.js tests/admin-ops.spec.js
```

E2E는 Supabase와 API를 mock 한다(`tests/helpers/live-fixture.js`). 카카오 로그인과 운영 DB를 포함한 실제 흐름은 [docs/manual-e2e-checklist.md](docs/manual-e2e-checklist.md)로 사람이 확인한다.

## 기여 규칙 요약

- `main`에 직접 push하지 않는다. `a/…`(Part A) 또는 `b/…`(Part B) 브랜치 → PR → CI 초록 → squash 병합.
- 저장소 이름, Pages 경로 `/party-connect-mvp/`, localStorage 키(`partyconnect:*`)는 바꾸지 않는다.
- 생년월일·나이·연령 확인 기능은 범위 밖이다. 성인·신분증 확인은 파티 현장 운영자가 담당한다.
