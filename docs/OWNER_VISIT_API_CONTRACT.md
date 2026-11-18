# 점주(Owner) 방문 인증 API 계약 — Jacob 서버 작업용 초안

- 작성: 2026-11-19, 웹 측 골격 구현과 함께 정의 (저장소: party-connect-mvp `p2/owner-s04`)
- 대상 기능: **S-04 점주 방문 인증** — 점주가 게스트가 보여 준 방문 코드를 직접 확인해 인증한다.
- 현황: **서버 측 점주(Owner) 권한 API는 아직 없다.** 이 문서는 `POST /owner/applications/:id/verify-visit` 의 계약 초안이며, 기존 관리자 흐름과 **규칙은 동일하고 권한만 분리**된 형태다.
- 대응 관계: `FEATURE_SPEC.md` S-04 / 한계 **L-05**(운영자 부재 시 현장 인증 불가), L-B(인증 시간창).

> 아래 서버 정보(라우팅 접두어, 테이블·컬럼명, 코드값)는 구현 편의를 위한 **예시**다. 실제 partylink 스키마·라우터 관례(예: Edge Function `partylink-api` 경로 규약)에 맞춰 확정할 것.

## 1. 엔드포인트

```
POST /owner/applications/:id/verify-visit
Content-Type: application/json

{ "code": "HC-7F3K9Q" }

200 OK
{ "ok": true, "applicationId": "app_1a2b", "storeId": "store_1", "partyId": "party_1",
  "status": "VISITED", "verifiedAt": "2026-11-19T12:00:00Z" }
```

- `:id` = 방문 인증 대상 **신청(application) ID**. 요청 본문에는 코드만 싣는다(코드 외 필드는 무시하거나 400 — 서버 관례에 맞춰 선택).
- 응답의 `verifiedAt` 은 서버 시각(KST 환경이면 UTC ISO-8601 권장). 웹 클라이언트는 표시 목적으로만 쓴다.

## 2. 권한 (관리자 엔드포인트와의 차이)

기존 `POST /admin/applications/:id/verify-visit` 와 **상태 전이·시간창·방문코드 검증 규칙은 동일**하다. 다른 것은 접근 주체뿐이다.

| 항목 | `/admin/applications/:id/verify-visit` | `/owner/applications/:id/verify-visit` |
|---|---|---|
| 호출 주체 | 관리자(`admins` 등록 계정, 운영 2인) | 점주 — 세션 유저가 **점포와 연결**되어 있어야 함 |
| 대상 범위 | 아무 신청이나 | **자기 점포(store)의 신청만**. 타 점포 신청은 존재를 남겨두지 않도록 404 |
| 점포 미연결 유저 | 해당 없음 | 403 `FORBIDDEN` (또는 점주 아님) |
| 권한 판단 위치 | 서버 | 서버 (웹은 숨김만, 판단 근거 아님) |

점주↔점포 연결은 예를 들어 `stores.ownerUserId` / 별도 link 테이블 등 기존 스키마에 맞는것으로 해석한다. 세션 해소·토큰 검증은 기존 홈과 동일 계층(Edge Function/API 게이트웨이) 재사용 전제.

## 3. 검증·상태 규칙 (관리자 흐름과 동일)

1. **코드 형식**: `^HC-[0-9A-Z]{6}$` (대문자, `HC-` 접두 + 영숫자 6). 서버는 정규화 없이 원문 그대로 검증하고 400 으로 응답한다(정규화는 클라이언트 책임).
2. **상태**: `APPROVED`(선정) 신청만 인증 가능. 이미 `VISITED` 이후 재인증 시도 → 409 `ALREADY_VERIFIED`. 노쇼/취소/반려 등 전이 충돌 → 409 `INVALID_STATE`.
3. **시간창(L-B)**: 파티 `startsAt - 60분 ≤ now ≤ endsAt`. 시작 60분 전 이전 시도 → 409 `OUTSIDE_WINDOW`("아직 이르습니다" 계열), **종료 후** → 410 `WINDOW_EXPIRED`.
4. **원자성**: 조건부 UPDATE 예 — `WHERE id=:id AND status='APPROVED' AND :now >= starts_at - interval '60 minutes' AND :now <= ends_at`; 영향 행수 0 이면 재조회로 409/410/404 구분. 방문 시각 기록 컬럼(`visited_at`) 설정, 재인증 불가는 상태가 게이트한다.
5. **멱등/1회성**: 인증 성공 시 상태가 `VISITED` 로 전이되므로 코드 재사용은 자연스럽게 409 로 막힌다.
6. 이웃 전이(노쇼 처리 등)와의 경합은 기존 관리자 흐름과 동일한 잠금/원자적 갱신 관례를 따른다.

## 4. 에러 응답 표

`{ "code": "...", "message": "..." }` — `message` 는 그대로 사용자에게 보여주는 문구.

| 상태 | code | 의미 / 상황 | 클라이언트(웹) 처리 |
|---|---|---|---|
| 400 | `INVALID_CODE_FORMAT` | 코드 형식 불일치(대문자 `HC-`+6자 아님) | 입력 오류 표시(클라이언트 검증과 동일 규칙) |
| 401 | `UNAUTHENTICATED` | 세션 없음/만료 | 재로그인 유도(로그인 UI 는 후속 범위, S-03 계열) |
| 403 | `FORBIDDEN` | 점주 아님/점포 미연결 | 권한 안내 |
| 404 | `NOT_FOUND` | 신청 없음 **또는 타 점포 신청**(존재 비공개) | "신청 정보를 찾을 수 없습니다" 계열 |
| 409 | `ALREADY_VERIFIED` | 이미 방문 인증된 신청 | 중복 인증 안내 |
| 409 | `INVALID_STATE` | 노쇼·취소·반려 등 규칙상 불가 상태 | 상태 안내(서버 문구 그대로) |
| 409 | `OUTSIDE_WINDOW` | 시간창 이전(시작 60분 전 이전) | "아직 인증 시간이 아닙니다" 계열 |
| 410 | `WINDOW_EXPIRED` | 파티 종료 후(인증 기한 만료) | 만료 안내(종료 후 미인증 = 노쇼 처리 흐름은 운영자 규칙) |
| 405/500 | — | 라우팅/서버 오류 | "요청을 처리하지 못했습니다" 폴백 |

- 404 의 "타 점포 신청" 비공개는 정보 노출 최소화 선택이다. 존재 공개 정책이면 403 로 올려도 된다(계약 변경점 명시 요망).
- Rate limit 도입 시 `429` + `Retry-After`(운영 결정 사항, 필수 아님).

## 5. 웹 골격과의 대응

- 페이지: `owner/visit.html`, 모듈: `js/owner-visit.js` (`window.OwnerVisit`).
- `OwnerVisit.verifyVisit(applicationId, code)` — `ownerApiEnabled` 가 false 거나 transport 미연결이면 **네트워크 요청 없이** 거부(fail-closed). 서버 배포 시 `OwnerVisit.configure({ ownerApiEnabled: true, transport })` 로 연결.
- 계약 테스트 대역: `tests/owner-visit.spec.js` (Playwright, 네트워크 mock). 실제 통합은 서버 배포 후 실 점주 세션으로 확인.
