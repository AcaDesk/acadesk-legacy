-- 중복 permissive 정책 정리
-- 같은 role+action에 적용되는 정책이 2개 이상이면 row마다 모든 정책의 OR 평가가 발생.
-- Supabase performance advisor (multiple_permissive_policies) 18건 해결.
-- (3개 테이블 × 6개 role의 SELECT 중복)

-- ============================================================
-- attendance
--   기존:
--     - attendance_select_same_tenant (SELECT)  → tenant 동일
--     - attendance_write_staff (ALL)            → tenant + staff role
--   SELECT 시 두 정책 모두 OR 평가됨.
--   조치: write_staff 의 cmd 를 ALL → INSERT/UPDATE/DELETE 로 분리.
-- ============================================================
DROP POLICY IF EXISTS attendance_write_staff ON public.attendance;

CREATE POLICY attendance_insert_staff ON public.attendance
  FOR INSERT
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  );

CREATE POLICY attendance_update_staff ON public.attendance
  FOR UPDATE
  USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  );

CREATE POLICY attendance_delete_staff ON public.attendance
  FOR DELETE
  USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  );

-- ============================================================
-- attendance_sessions  (동일 패턴)
-- ============================================================
DROP POLICY IF EXISTS attendance_sessions_write_staff ON public.attendance_sessions;

CREATE POLICY attendance_sessions_insert_staff ON public.attendance_sessions
  FOR INSERT
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  );

CREATE POLICY attendance_sessions_update_staff ON public.attendance_sessions
  FOR UPDATE
  USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  )
  WITH CHECK (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  );

CREATE POLICY attendance_sessions_delete_staff ON public.attendance_sessions
  FOR DELETE
  USING (
    tenant_id = current_user_tenant_id()
    AND current_user_role() = ANY (ARRAY['owner','instructor','assistant'])
  );

-- ============================================================
-- support_tickets
--   기존 SELECT 정책 2개:
--     - "Staff can view tenant tickets" : tenant 단위
--     - "Users can view own tickets"   : 본인 ticket
--   조치: 단일 SELECT 정책으로 OR 병합.
--   의미: 같은 tenant 직원이거나 본인 ticket 이면 조회 가능 (deleted_at 제외).
-- ============================================================
DROP POLICY IF EXISTS "Staff can view tenant tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;

CREATE POLICY support_tickets_select ON public.support_tickets
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid)
      OR user_id = (SELECT auth.uid())
    )
  );
