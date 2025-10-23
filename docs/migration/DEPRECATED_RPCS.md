# Deprecated RPC Functions

이 문서는 더 이상 사용되지 않는 RPC 함수 목록입니다.

## owner_setup_upsert

**위치:** `db/schema/20_rpc/210_owner_setup_upsert.sql`

**이유:** Server Action으로 마이그레이션됨

**대체:** `src/app/actions/onboarding.ts::completeOwnerOnboarding`

**제거 예정일:** 마이그레이션 완료 후 (Phase 6)

**설명:**
- 이전에는 클라이언트에서 `authStageService.ownerFinishSetup()`을 통해 이 RPC를 호출
- 이제는 Server Action `completeOwnerOnboarding()`가 service_role로 `complete_owner_onboarding` + `finish_owner_academy_setup`을 호출
- `owner_setup_upsert`는 중간 레이어로서 더 이상 필요하지 않음

**사용처:**
- ~~`src/infrastructure/auth/auth-stage.service.ts::ownerFinishSetup()`~~ (제거 예정)

---

## 제거 체크리스트

Phase 6에서 다음 순서로 제거:

1. `src/infrastructure/auth/auth-stage.service.ts`에서 `ownerFinishSetup()` 제거
2. `src/hooks/use-auth-stage.ts`에서 `finishOwnerSetup()` 제거 (또는 전체 파일 제거)
3. `db/schema/20_rpc/210_owner_setup_upsert.sql` 파일 제거
4. `supabase/migrations/13_owner_setup_upsert.sql` 검토 후 제거 또는 주석 처리
5. Grant 권한 정리 (`db/schema/50_grants/500_grants.sql`)
