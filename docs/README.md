# HypeConnect 문서 안내

이 폴더는 HypeConnect의 제품·인증·UI/UX·배포 기준을 보관한다. 현재 코드 상태와 목표 요구사항을 구분하고, 검증하지 않은 기능을 완료로 표시하지 않는다.

## 문서 지도

| 문서 | 목적 | 단일 기준 |
|---|---|---|
| [AUTH_IMPLEMENTATION_SPEC.md](AUTH_IMPLEMENTATION_SPEC.md) | Kakao OAuth, Supabase Auth, 세션, 회원 동의, API, 보안 | 인증 동작·기술 계약 |
| [AUTH_UI_UX_SPEC.md](AUTH_UI_UX_SPEC.md) | 로그인, callback, 가입 동의, 신청 복귀, 오류, 반응형 화면 | 인증 화면·상호작용 |
| [AUTH_DEPLOYMENT_CHECKLIST.md](AUTH_DEPLOYMENT_CHECKLIST.md) | Kakao/Supabase 콘솔, DB migration, Edge Function, 배포 | 운영 담당자 절차 |

## 저장소 최상위 문서

- [README](../README.md): 프로젝트 진입점, 현재 상태, 로컬 실행·테스트
- [SPECIFICATION](../SPECIFICATION.md): 제품 범위, 역할, 기술 구조, 우선순위
- [전용 페이지 구현 명세](../HYPECONNECT_PAGE_IMPLEMENTATION_SPEC.md): 파티 탐색·신청 화면의 기능 기준
- [UI/UX 결정 기록](../UI_UX_DECISION_RECORD.md): 브랜드 토큰과 누적 디자인 결정
- [ELI10 현황 보고](../ELI10_REPORT.md): 기준 시점의 배포·검증·미결 사항

## 문서 유지 규칙

1. README에는 요약만 둔다. 상세 요구사항을 복제하지 않는다.
2. 인증 구현 규칙은 AUTH_IMPLEMENTATION_SPEC, 화면 규칙은 AUTH_UI_UX_SPEC, 운영 절차는 AUTH_DEPLOYMENT_CHECKLIST를 기준으로 한다.
3. 상태는 **구현·검증됨**, **코드 존재·실서비스 미검증**, **미구현**, **차단**으로 구분한다.
4. CI 성공은 그 테스트가 실행한 범위만 증명한다. 실제 Kakao OAuth·DB 통합을 대체하지 않는다.
5. main 코드가 바뀌면 README, ELI10 및 관련 명세의 기준 SHA와 상태를 함께 갱신한다.
6. 운영 DB 변경, 실제 개인정보 처리, 비밀키 변경은 별도 승인 없이 수행하지 않는다.
7. 생년월일·나이·연령 확인은 HypeConnect 회원 인증 범위가 아니다. 관련 요구사항을 임의로 추가하지 않는다.
8. .agents/skills 아래 문서는 설치된 에이전트 스킬과 참조 라이브러리다. 제품 명세 정리 과정에서 임의 수정하지 않는다.

최종 수정일: 2026-11-08
