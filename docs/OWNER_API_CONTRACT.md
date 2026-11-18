# HypeConnect 점주(owner) API 계약 — 초안 (서버 담당자 검토용)

- 작성일: 2026-11-19
- 짝을 이루는 클라이언트 골격: `owner/index.html`, `js/owner-api.js`
- 상태: **초안(draft)**. 엔드포인트·스키마·마이그레이션은 서버 담당자(Jacob) 구현을 기준으로 확정한다.
  클라이언트는 `window.PARTYLINK_CONFIG.ownerApiEnabled === true` 일 때만 이 계약으로 요청을 보낸다(기본 비활성, fail-closed).

## 1. 전제와 원칙

- S-03 = "점주가 직접 로그인해 자기 파티의 신청자를 본다". 점주 로그인·조회는 **관리자 화면(`/admin/*`, `admins`)과 분리된 별도 권한**이다.
- **권한 판정은 서버만 한다.** 클라이언트 플래그·화면 숨김은 편의일 뿐이며, 데이터 노출 여부는 서버 조회 결과로 결정된다.
- 점소는 자기 점포(store)의 파티와 그 신청자만 조회한다. 다른 점주/다른 점포 데이터는 어떤 엔드포인트에서도 흘러나오면 안 된다.
- 기존 공용 인증 위에 올린다: `js/auth-client.js`의 client(anon/publishable 키 + 사용자 세션) 흐름 재사용, `Authorization: Bearer <user access_token>` + `apikey`. **service_role/secret 키 사용 금지.**
- 응답 에러는 JSON `{ "message": "...", "code": "..." }`, HTTP 상태 코드 의미론 준수.

## 2. 엔드포인트

| 목적 | 메서드·경로 | 인증 | 요청 | 응답(200) | 에러 코드(초안) |
|---|---|---|---|---|---|
| 로그인한 계정이 점주인지 확인 | `GET /owner/me` | 세션 | 없음 | `OwnerMe` | `UNAUTHENTICATED`(401) · `NOT_OWNER`(403) |
| 내 점포 파티 목록 | `GET /owner/parties` | 세션 | 없음(페이징 필요해지면 `limit` 협의) | `{ "parties": OwnerParty[] }` | `UNAUTHENTICATED`(401) · `NOT_OWNER`(403) |
| 파티 신청자 목록 | `GET /owner/applications?partyId=<partyId>` | 세션 | `partyId` 필수 | `{ "applications": OwnerApplication[] }` | `UNAUTHENTICATED`(401) · `NOT_OWNER`(403) · `NOT_FOUND`(404, 파티 미보유 — 존재 비노출) |
| 방문 인증(점주 입력 코드) | `POST /owner/applications/:id/verify-visit` | 세션 | `{ "code": string }` | `{ "applicationId": "...", "status": "..." }` (또는 `{ "ok": true }` — 확정 필요) | `UNAUTHENTICATED`(401) · `NOT_OWNER`(403) · `NOT_FOUND`(404) · `INVALID_CODE`(400/404 — 확정) · 기존 방문 인증 시간 규칙 위반 시 서버 기존 코드 재사용 |

- `:id` = 신청(application) 식별자. `verifyVisit(appId, code)`의 원시 값은 URL 인코딩해 경로에 둔다.
- 방문 인증의 **허용 시간대·코드 규칙은 새 계약을 만들지 않고 서버 기존 규칙을 그대로 적용**한다(임의 완화 금지).
- 상담원/운영자용 방문 인증은 기존 관리자 API 그대로이며, 이 계약이 대체하지 않는다.

### 응답 스키마 (초안)

```jsonc
// GET /owner/me 200
{ "owner": { "id": "uuid", "storeId": "uuid", "displayName": "홍길동", "email": "owner@example.com" } }

// GET /owner/parties 200
{ "parties": [
  { "id": "uuid", "storeId": "uuid", "title": "금요 혼술", "startsAt": "2026-11-13T10:00:00Z",
    "status": "OPEN|CLOSED|CANCELLED" }
] }

// GET /owner/applications?partyId=uuid 200
{ "applications": [
  { "id": "uuid", "partyId": "uuid", "name": "홍길동", "phone": "01012345678",
    "status": "APPLIED|APPROVED|VISITED|MISSION_SUBMITTED|COMPLETED|REJECTED|NOSHOW|CANCELLED",
    "appliedAt": "2026-11-10T01:00:00Z", "visitCode": "K7M2ABCD12", "rejectReason": null }
] }

// 오류 예시
// 403
{ "message": "이 계정은 점주로 등록되어 있지 않습니다.", "code": "NOT_OWNER" }
```

- `status` 문자열은 서버 기존 신청 상태 전이 값 집합을 재사용한다(새 값 만들지 않는다).
- 클라이언트가 추가로 가정한 것: `me`/`parties`/`applications` 성공 시에는 응답 JSON 원문을 그대로 쓰고, 비활성화 응답 `{ "available": false }` 는 **클라이언트 측 게이트**(설정 미수)일 뿐 서버 응답 스키마가 아니다 — 서버는 그런 봉투를 반환할 필요가 없다.

## 3. 권한 모델 (초안, 둘 중 하나 확정)

**권장: `owners` 별도 테이블** — 점주는 여러 명일 수 있고(비활성/교체/겸업), `admins`와의 분리가 스키마 수준에서 명확해진다.

```sql
-- 초안 — 최종 네이밍/타입/제약은 Jacob 확정
create table owners (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references stores(id) on delete cascade,
  supabase_user_id text not null unique,      -- auth.users.id (로컬 dev: 테스트 계정 명시)
  display_name   text,
  email          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid,                        -- 관리비상 admin authorship 남기고 싶으면 admins.id 참조
  constraint owners_store_user_unique unique (store_id, supabase_user_id)
);
create index owners_user_idx on owners (supabase_user_id) where is_active;
```

대안(풋): `stores.owner_user_id` — 단순하지만 점주 다중화·비활성·감사에 약하다. 어느 쪽이든 **admin 권한 테이블/컬럼을 재사용하거나 공유하지 않는다.**

절차 서버(엣지 함수 또는 동급)에서는 `auth.uid()` 기준 조회:

```sql
-- 의사 SQL(초안): "자기 점포 파티만" — 서버 함수에서만 실행되는 패턴
-- parties: store_id in (select store_id from owners where supabase_user_id = $uid and store_active)
-- applications: join parties on store_id ... and owner membership same predicate
```

- RLS를 켠다면 정책도 동일 술어(`supabase_user_id = auth.uid()`, `is_active`)로 — 화면/클라이언트 가정 금지.
- 비활성/미등록 사용자는 403 `NOT_OWNER`(또는 미등록을 구분해야 하면 별도 코드, 확정 필요).

## 4. 마이그레이션 상태

- 위 `owners` 초안은 **아직 스키마에 반영되지 않은 제안**이다. Jacob 확인 후 마이그레이션/버전 이력에 반영한다.
- 기존 테이블(`stores`, 신청/파티, 적립금 원장 등)의 실제 스키마·네이밍은 이 저장소 웹에는 없으므로, 조회 구현 전 실제 서버 스키마와 대조한다. 호스트 프로젝트·충돌 시 Jacob 결정.

## 5. Jacob 구현 체크리스트(초안)

1. 이주: `owners`(또는 합의된 대안) + 필요 인덱스/제약.
2. 라우트 4종 + 세션 검증 + `owner` 술어 필터(위 2·3조).
3. 에러 코드/메시지 계약 표대로.
4. 웹 배포 설정에 `ownerApiEnabled: true` (계약 구현·검증 후에만).
5. 클라이언트 검증 시나리오: 미로그인 401 / 비점주 403 / 타 점포 파티 접근 시 비노출 / 정상 조회 200 / 잘못된 방문 코드.
