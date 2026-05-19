-- tenant_event_subscriptions RLS 정책 InitPlan 최적화
--
-- 배경:
--   - advisor `auth_rls_initplan` 경고 — 정책 내부 auth.uid() 가 row-wise 재평가됨
--   - 현재 사용은 service_role 패턴이라 RLS 미평가지만, 카카오 알림톡 이벤트
--     트리거가 활성화되면 row 폭증 예상. 사전 위생 작업.
--
-- 개선:
--   auth.uid() → (SELECT auth.uid())  으로 명시적 감싸기로 InitPlan 승격
--   → row 수만큼 호출 → 1회 호출

DROP POLICY IF EXISTS event_subs_select_policy ON public.tenant_event_subscriptions;
CREATE POLICY event_subs_select_policy
  ON public.tenant_event_subscriptions
  FOR SELECT
  USING (
    tenant_id = (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS event_subs_insert_policy ON public.tenant_event_subscriptions;
CREATE POLICY event_subs_insert_policy
  ON public.tenant_event_subscriptions
  FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS event_subs_update_policy ON public.tenant_event_subscriptions;
CREATE POLICY event_subs_update_policy
  ON public.tenant_event_subscriptions
  FOR UPDATE
  USING (
    tenant_id = (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT u.tenant_id
      FROM public.users u
      WHERE u.id = (SELECT auth.uid())
    )
  );
