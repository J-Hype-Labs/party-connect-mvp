# PartyConnect 문서 안내

이 폴더는 PartyConnect의 구현·운영 기준 문서를 보관한다. 현재 구현 상태는 문서 작성일만으로 추정하지 않고, 각 문서의 기준 SHA와 GitHub Actions 증거를 함께 확인한다.

## 문서 지도

| 문서 | 목적 | 기준 |
|---|---|---|
| [인증 구현 명세](AUTH_IMPLEMENTATION_SPEC.md) | 카카오 OAuth, Supabase Auth, 회원 상태, 신청 연결, 보안/API 계약 | 인증 구현의 단일 기술 기준 |
| [인증 UI/UX 명세](AUTH_UI_UX_SPEC.md) | 로그인·가입·콜백·신청·오류 화면과 반응형 동작 | 인증 화면의 단일 UX 기준 |
| [인증 배포 체크리스트](AUTH_DEPLOYMENT_CHECKLIST.md) | 카카오/Supabase 설정, 마이그레이션, 배포 전 검증 | 운영 담당자 실행 기준 |

## 최상위 문서

- [README](../README.md): 프로젝트 진입점, 실행·테스트·배포 방법, 현재 상태
- [통합 개발 명세](../SPECIFICATION.md): 제품 범위, 역할, 기능, 아키텍처, 상태
- [전용 페이지 구현 명세](../PARTY_CONNECT_PAGE_IMPLEMENTATION_SPEC.md): 파티커넥트 페이지의 기능과 회귀 기준
- [UI/UX 결정 기록](../UI_UX_DECISION_RECORD.md): 실제 디자인 토큰과 누적 결정
- [ELI10 현황 보고](../ELI10_REPORT.md): 특정 시점의 배포·검증·미결 사항

## 문서 유지 원칙

1. README는 요약과 진입점만 유지한다. 상세 명세를 복제하지 않는다.
2. 인증 구현 규칙은 AUTH_IMPLEMENTATION_SPEC, 화면 규칙은 AUTH_UI_UX_SPEC, 콘솔 작업은 AUTH_DEPLOYMENT_CHECKLIST를 기준으로 한다.
3. 구현 상태는 **구현됨**, **코드 존재·실서비스 미검증**, **미구현**, **차단**으로 구분한다.
4. CI 성공은 해당 테스트가 검증한 범위만 증명한다. 실제 카카오 OAuth와 실제 DB 검증을 대체하지 않는다.
5. 운영 설정·실제 개인정보 처리·운영 DB 변경은 명시적 승인과 별도 검증 없이 수행하지 않는다.
6. 서비스가 수집하지 않는 정보와 처리하지 않는 업무를 임의로 기능 요구사항으로 추가하지 않는다.
7. 이 저장소의 .agents/skills 아래 문서는 설치된 에이전트 스킬 및 참조 자료다. 제품 명세와 혼합하거나 프로젝트 문서 정리 과정에서 임의 수정하지 않는다.

최종 수정일: 2026-11-08
