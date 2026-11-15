# PM 인계 메모

- 갱신: 2026-11-15
- 용도: PM 세션을 새로 시작할 때 이 문서부터 읽는다. 상세는 링크한 문서에 있고, 여기에는 **지금 상태와 다음 할 일**만 적는다.

## 읽는 순서

1. [`SPECIFICATION.md`](../SPECIFICATION.md) — 기준 명세. 7장 분담, 8장 개발 흐름과 "기다리지 않고 일하는 규칙".
2. [`FEATURE_SPEC.md`](FEATURE_SPEC.md) — 전체 기능 목록과 1단계(F0-1~F0-7).
3. [`DECISIONS_NEEDED.md`](DECISIONS_NEEDED.md) — 결정 질문 29개. P0 12개는 결정됨.
4. Notion MILESTONE 페이지 — 일정 기준(M4 11/16 시작, M5 11/20, M6 11/27).

## 저장소와 폴더 (Jacob PC)

| 저장소 | 로컬 폴더 | 내용 |
|---|---|---|
| `J-Hype-Labs/party-connect-mvp` | `/Users/jacob/Desktop/party-connect-mvp-work` (main) | 웹(게스트·관리자 화면), 이 문서 |
| `J-Hype-Labs/partylink` | `/Users/jacob/Desktop/Partylink01` | Supabase 마이그레이션, Edge Function `partylink-api` |

운영 Supabase 프로젝트는 `Partylink01`(ref `cpctedhhojmbycnqhzli`) 하나다. 스테이징은 없다.

## 지금 상태 (2026-11-15)

- **M3 완료.** 카카오 로그인부터 신청·선정·방문 인증·미션·최종 승인까지 운영 서버에서 검증했다.
- 운영 DB에는 실제 점포가 없다. `[E2E]`로 시작하는 중지된 테스트 점포와 원장 3건만 있다.
- 관리자 계정은 2개다(Jacob, 6Soo). **6Soo의 `/admin/` 로그인은 아직 확인하지 못했다.**
- 2026-11-15에 끝낸 운영 설정: 공개 Storage 버킷 `party-images` 생성, 카카오 콘솔 앱 이름 `HypeConnect`·회사명 `J Hype Labs`·아이콘 변경.

## 다음 할 일

### Part A (Jacob 쪽 세션)
1. F0-4 관리자 점포 등록의 지역을 필터와 같은 목록에서 선택하게 변경.
2. F0-5 관리자 파티 등록에 이미지 URL·배지·추천 입력 추가, 미션 조건 기본값에 협찬 표시 문구 추가(Q-25).
3. partylink PR #15(정산 절차서, 문서만 변경, CI 통과)를 병합.

### Part B (6Soo 세션)
1. F0-1 예시 파티 쇼케이스(실제 6건 미만일 때 최소 6건 표시, "신청 오픈 예정" 비활성).
2. F0-2 예시 데이터 가명 처리와 외부 이미지 의존 제거.
3. F0-3 후기 섹션 숨김, 미구현 배너 교체.

### 사람이 해야 하는 일
- Jacob: 사업자 정보(Q-12, **보류 중**), Supabase 리디렉션 목록에서 `http://localhost:3000/**` 제거, M2 영업 현황, 첫 실제 점포·파티 등록.
- 두 사람: P1 질문에 이견이 있으면 **11/18까지** `DECISIONS_NEEDED.md`에 적기. 없으면 예시 답변으로 확정.

## 지켜야 할 것

- 병합 규칙은 SPECIFICATION 8장을 따른다. 문서만 바꾼 PR은 CI 초록이면 병합, Part B PR은 6Soo가 병합, 운영 DB·배포·삭제·시크릿은 건별로 Jacob 승인.
- 병합은 `gh pr merge N --squash --match-head-commit <전체 SHA>`로 한다(검사한 커밋과 병합하는 커밋이 같아야 한다).
- `6Soo` 브랜치는 지우지 않는다. 다른 브랜치는 `archive/<브랜치명>` 태그를 남긴 뒤 지운다.
- 운영 원장(`deposit_histories`)은 고치거나 지우지 않는다. 테스트 데이터는 점포 이름을 `[E2E]`로 시작한다.
- 비밀번호 입력, 약관 동의는 사람이 한다.
