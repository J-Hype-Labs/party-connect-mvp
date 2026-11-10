# HypeConnect 문서 안내

기준 문서는 저장소 최상위의 **[SPECIFICATION.md](../SPECIFICATION.md)** 하나다. 아래 문서는 그 명세의 상세 참조이며, 각 문서의 "현재 상태" 표는 작성 시점 기록이다. 현재 상태는 SPECIFICATION.md 4장을 따른다.

## 상세 참조

| 문서 | 내용 | 담당 파트 |
|---|---|---|
| [admin-page.md](admin-page.md) | 관리자 화면 구성·실행·테스트 | A |
| [manual-e2e-checklist.md](manual-e2e-checklist.md) | 카카오 로그인 + 운영 DB 실서버 수동 검증 | A·B |
| [AUTH_IMPLEMENTATION_SPEC.md](AUTH_IMPLEMENTATION_SPEC.md) | 카카오 OAuth, Supabase Auth, 세션, 동의, 보안 계약 | B |
| [AUTH_UI_UX_SPEC.md](AUTH_UI_UX_SPEC.md) | 로그인·callback·가입 동의·오류 화면 | B |
| [AUTH_DEPLOYMENT_CHECKLIST.md](AUTH_DEPLOYMENT_CHECKLIST.md) | 카카오·Supabase 콘솔과 배포 절차 | A·B |
| [MAP_EXPLORATION_DESIGN.md](MAP_EXPLORATION_DESIGN.md) | 지도 기반 탐색 설계 (보류) | B |

서버 쪽 문서(`partylink` 저장소): `docs/party-connect-integration.md`(API 계약), `docs/admin-page-spec.md`(관리자 명세 v1.0), `docs/settlement-check.md`(정산 검증 SQL).

## 보관 문서

[archive/](archive/)에는 2026-11-10 통합 이전의 명세(전용 페이지 구현 명세, UI/UX 결정 기록, ELI10 현황 보고)가 있다. 기준이 아니다. 여기에 있던 유효한 규칙은 SPECIFICATION.md 5~6장에 옮겼다.

## 문서 유지 규칙

1. 상태나 범위가 바뀌면 SPECIFICATION.md를 같은 PR에서 고친다. 다른 문서에 상태를 복제하지 않는다.
2. 상태는 "구현·검증됨 / 코드 존재·실서비스 미검증 / 미구현 / 보류"로 구분한다.
3. CI 성공은 그 테스트가 실행한 범위만 증명한다. 실제 카카오 OAuth·DB 통합을 대체하지 않는다.
4. 운영 DB 변경, 실제 개인정보 처리, 비밀키 변경은 별도 승인 없이 하지 않는다.
5. `.agents/skills` 아래 문서는 설치된 에이전트 스킬 자료다. 명세 정리 대상이 아니다.
