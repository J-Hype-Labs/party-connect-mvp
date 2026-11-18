# PM 인계 메모

- 갱신: 2026-11-19
- 용도: PM 세션을 새로 시작할 때 이 문서부터 읽는다. 상세는 링크한 문서에 있고, 여기에는 **지금 상태와 다음 할 일**만 적는다.

## 읽는 순서

1. [`SPECIFICATION.md`](../SPECIFICATION.md) — 기준 명세. 7장 분담, 8장 개발 흐름.
2. [`FEATURE_SPEC.md`](FEATURE_SPEC.md) — 전체 기능 목록·상태표(최신).
3. [`DECISIONS_NEEDED.md`](DECISIONS_NEEDED.md) — 결정 질문. P0 12개 결정됨, P1 중 Q-08·Q-16·Q-21은 2026-11-18 확정·반영.
4. [`EXECUTION_HANDOFF.md`](EXECUTION_HANDOFF.md) — 실행 기록(무엇을 어떤 근거로 했는지 누적).

## 저장소

| 저장소 | 내용 | 비고 |
|---|---|---|
| `J-Hype-Labs/party-connect-mvp` (이 저장소) | 웹(게스트·관리자·점주 화면), 문서 | 기본 브랜치 작업 `6Soo`, 배포는 `main` → GitHub Pages |
| `J-Hype-Labs/partylink` | Supabase 마이그레이션, Edge Function `partylink-api` | **이 작업 환경에는 없다** → 서버 API 항목은 여기서 구현 불가 |

운영 Supabase 프로젝트는 `Partylink01`(ref `cpctedhhojmbycnqhzli`) 하나다. 스테이징은 없다.

## 지금 상태 (2026-11-19)

- **웹에서 구현 가능한 항목은 모두 구현·자동검증 완료.** 상세는 `FEATURE_SPEC.md` 상태표.
- 최근 완료: P1 정책 문구(선정 기준·노쇼 30일·검수 체크리스트), G-21 알림 함, G-22 후기 게이트, P2 점주 로그인·방문 인증 골격, 관리자 처리 기록 표시, **G-09 지도 탐색**.
- 공개 사이트(GitHub Pages)에 위 결과가 배포됨. 단 **지도는 카카오 키가 없어 비활성**, 점주 화면·처리 기록은 기본값 꺼짐(fail-closed)이라 현재 동작 변화 없음.
- 운영 DB에는 실제 점포·파티가 0건이라 예시 쇼케이스(6건)가 표시된다.

## 다음 할 일

### 사람이 해야 하는 일 (코드로 해결 불가)

| 누가 | 무엇 | 왜 |
|---|---|---|
| Jacob | 카카오 JavaScript 키 발급 + `https://j-hype-labs.github.io` 도메인 등록 + 카카오맵 사용 설정 | 지도를 실제로 켜려면 필요 |
| Jacob | `partylink` 서버에 점주 API(계약 문서 3종 참고) 구현 | 점주 화면·처리 기록 실제 연동 |
| Jacob | 사업자 정보 값(대표자·사업자번호·주소) — **보류 중** | L-03 푸터 |
| 운영 | 약관·개인정보 처리방침 본문, 보관기간, 보호책임자 | L-01 |
| Jacob | 계약 점포·파티를 관리자 화면으로 등록 | 실데이터 검증(F0-7), 예시 쇼케이스 축소 |

### 서버 선행 후 이어갈 일

G-18 탈퇴, G-19 찜 동기화, G-20 결과 알림(푸시), G-22 후기 DB, S-02 제휴 신청 폼, S-05 정산 내역서, M-09 정산 대조, L-02 보관·파기, L-04 오류 모니터링, L-07 키 이전.

계약 문서(서버 담당이 바로 쓸 수 있게 정리됨): [`OWNER_API_CONTRACT.md`](OWNER_API_CONTRACT.md), [`OWNER_VISIT_API_CONTRACT.md`](OWNER_VISIT_API_CONTRACT.md), [`ADMIN_AUDIT_API_CONTRACT.md`](ADMIN_AUDIT_API_CONTRACT.md).

### 별도 승인 필요

G-14 실서버 취소 검증, G-04 실데이터 필터 확인, L-05 운영 사이트 자동 스모크 — 모두 운영 DB·실서버 접근이 필요하다.

## 지켜야 할 것

- 홈페이지는 **운영 중이 아닌 개발 단계**다. 검증(CI 통과) 후에는 언제나 `main`으로 병합한다. 운영 DB 쓰기·운영 배포·시크릿 변경은 여전히 Jacob 명시 승인 필요.
- 병합은 `gh pr merge N --squash`(`--delete-branch` 금지). `6Soo` 브랜치는 지우지 않는다.
- 운영 원장(`deposit_histories`)은 고치거나 지우지 않는다. 테스트 데이터는 점포 이름을 `[E2E]`로 시작한다.
- 비밀번호 입력, 약관 동의는 사람이 한다.
- 새 기능의 서버 의존 기본값은 **꺼짐(fail-closed)** 으로 두고, 서버가 준비되면 설정 한 줄로 켠다.
