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
  );;
