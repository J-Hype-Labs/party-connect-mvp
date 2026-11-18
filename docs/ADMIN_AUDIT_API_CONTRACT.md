# 관리 행위 감사 로그 — 서버 API 계약 초안 (Jacob용)

- 관련: FEATURE_SPEC **M-12**(관리 행위 기록) / DECISIONS_NEEDED **Q-14**(관리 행위 기록).
- 목적: 관리자 2명 체제에서 "누가 선정·반려했는지"를 남길 수 있게 한다. 게스트 문의 대응·내부 확인용.
- 상태: **제안 초안**. 작성 시점 기준 이 계약을 구현하는 서버 테이블·엔드포인트는 확인되지 않았다. 웹 측은 표시 준비만 되어 있고 **아직 연동하지 않았다**(아래 "웹 현재 상태" 참고).
- 원칙: 감사 레코드는 **서버만 생성**한다. 클라이언트는 표시만 하며 생성·조작·추정하지 않는다.

## 1. 테이블 초안

이름 후보: `admin_actions`(아래 초안) 또는 `application_events`. 실제 전이가 신청(application) 밖(예: 게스트 차단)도 포함하므로 이름이 "application"에 갇히지 않는 편이 낫다 — 결정 필요(§5).

```sql
-- 초안. 타입·컬럼명·제약은 Jacob 확정 전 제안. 스테이징 검증(Q-15) 후 운영 반영 권장.
CREATE TABLE admin_actions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 또는 uuid
  application_id bigint NULL REFERENCES applications(id) ON DELETE SET NULL,
  actor_user_id  text NOT NULL,        -- admins 참조(실제 컬럼명·타입 확인). actor_name 스냅샷과 함께 저장
  actor_name     text NOT NULL,        -- 표시용 스냅샷(관리자 개명·계정 정리 후에도 기록 유지)
  action         text NOT NULL,        -- 아래 §3 값만
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_actions_by_app_time ON admin_actions (application_id, created_at);
-- 최신 1건 조회(신청 id 기준) 용도. 조회 패턴에 따라 (application_id, created_at DESC) 방향성 검토.
```

메모:
- `application_id` NULL 허용: 차단처럼 신청 밖 대상 행위를 위해. NULL/메타데이터로 대상 표현 방식은 §5 결정.
- `actor_name`은 개인정보다. **수집·표시 범위 최소화**, 보관 기간은 L-02/Q-11 정책과 연동.
- 전이 커밋과 **같은 트랜잭션/같은 함수에서 INSERT**해 "전이됐는데 기록 없음"을 피한다. 전이 롤백 시 감사 레코드도 함께 롤백되는 게 자연스럽다.
- 소급 백필은 불가(기록은 행위 시점에만 존재 가능) — 운영 정책 결정 사항.

## 2. 조회 엔드포인트(초안)

```
GET /admin/audits?applicationId=<신청 id>&limit=<n>
```

- 관리자 인증 필요(기존 관리자 API와 동일 계층: 미인증 401, 비관리자 403 — 기존 관례 재사용).
- `applicationId` 지정: 해당 신청의 감사 레코드 **최신순**. 미지정: 전체 조회(관리자 목적, `limit` 기본값은 서버 정책).
- 응답 200:

```json
{ "audits": [
  { "id": 1024, "applicationId": "…", "actorUserId": "u1", "actorName": "주홍",
    "action": "approve", "metadata": {}, "at": "2026-11-20T00:10:00Z" }
] }
```

- 필드명 관례: 기존 관리자 API/웹이 쓰는 camelCase(`actorName`, `applicationId`) + 시각은 ISO 8601 UTC(`at`) — 웹 `summarize`가 KST로 변환한다. `metadata`는 객체 또는 생략 허용.
- 없는 신청/기록: 오류가 아니라 `{"audits":[]}`(200)가 기본값(정책 확정 권장).
- 페이지네이션 확장 시 기존 목록 API 관례(`limit`)를 따른다. 새 쿼리 파라미터는 서버-웹 동시 합의.

## 3. 기록해야 하는 전이

| 전이(현재 엔드포인트) | `action` 값 | 대상 키 | 메모 |
|---|---|---|---|
| 선정 `POST /admin/applications/{id}/approve` | `approve` | application_id | |
| 반려 `POST …/{id}/reject` | `reject` | application_id | 사유는 기존 신청 필드/rejectReason 정책 따름 |
| 방문 인증 `POST …/{id}/verify-visit` | `verify-visit` | application_id | 방문 코드 원문은 metadata 에 넣지 않는다(불필요 수집 금지) |
| 보완 요청 `POST …/{id}/request-revision` | `request-revision` | application_id | |
| 최종 승인 `POST …/{id}/complete` | `complete` | application_id | 적립금 원장 이벤트와 별개 계층(원장 불변, 감사는 부가 기록) |
| 노쇼 `POST …/{id}/noshow` | `noshow` | application_id | |
| 게스트 차단 `POST /admin/guests/{id}/block` | `block` | application_id NULL + `metadata.target` | 신청 밖 대상 — 표현 방식 §5 결정 |

참고(초안, 결정 필요): 게스트 신청 취소·자동 전이(파티 자동 마감 등)·충전/환불 같은 정산 행위도 "관리 행위"에 남길지. Q-14 문맥은 관리자가 처리한 선정·반려·방문 인증·노쇼·보완 요청·최종 승인·차단이므로 위 7개를 1차로 하고, 확장 시 `action` 값과 웹 라벨(`window.AdminAudit.ACTION_LABELS`)을 함께 늘린다.

## 4. 노출 규칙 — 관리자 화면에서만

- 감사 레코드(특히 `actorName`)는 **관리자 화면에서만** 표시한다. 게스트 화면·공개/게스트 API·공유 링크·SEO/프리뷰 메타데이터 어디에도 넣지 않는다.
- 검색 색인 차단 유지(`admin/`는 `robots: noindex, nofollow`).
- 조회 권한은 관리자 역할로 한정하고 서버가 매 요청 검증한다(화면 숨김은 편의일 뿐 — 기존 원칙).
- 내보내기(CSV 등) 확장 시 별도 검토. `actor_name`은 최소 표시 원칙.

## 5. 미확정(Jacob/PM)

1. 테이블명 `admin_actions` vs `application_events`, `id` 타입(bigint/uuid), `admins` FK 정확성.
2. 신청 밖 대상 행위(차단 등)의 표현: `application_id NULL + metadata.target` vs 일반화 `target_type/target_id`.
3. 자동/비관리자 주도 전이의 기록 범위.
4. `limit` 기본값·정렬·미지정 `applicationId` 허용 여부, 없는 신청 응답 형태.
5. 보관 기간·파기(L-02/Q-11 확정 연동) 및 `actor_name` 최소수집 점검.

## 6. 웹 현재 상태(참고 — 통합 시 참고)

- `js/admin-audit.js`(신규): `summarize`(표시 문자열), `ACTION_LABELS`, `merge`(최신 레코드 병합, 원본 불변 복사). 네트워크 없음, 서버 레코드 읽기만.
- `js/admin-app.js`: 카드 meta에 `처리:` 줄 — **항목에 `audit` 레코드가 있을 때만**, `window.AdminAudit`(summarize) 부재 시 아무것도 하지 않음(기존 출력 보존).
- `js/admin-api.js`: `audits(params)` 정의만 있고 **호출부 없음**. `window.AdminAudit.enabled === true` 또는 config의 `auditLog: true`일 때만 실제 요청(기본 꺼짐 → `null`).
- 통합 시 체크리스트: ① 게이트 켜기 ② 웹이 로드하는 스크립트에 `admin-audit.js` 포함(admin-app 보다 먼저) ③ 응답 필드 매핑(§2) 확인 ④ 표시는 관리자 화면 한정 재확인 ⑤ 기능/회귀 테스트.
