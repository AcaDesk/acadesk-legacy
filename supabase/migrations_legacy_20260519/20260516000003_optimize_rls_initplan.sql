-- RLS InitPlan 최적화
-- auth.<function>() / current_setting() 을 (SELECT ...) 로 감싸 row마다 재평가되지 않고
-- 쿼리당 1회만 평가되도록 변경. 의미는 동일.
-- Supabase performance advisor (auth_rls_initplan) 27건 해결.

-- ============================================================
-- batch_drafts (4건) — current_setting 기반
-- ============================================================
ALTER POLICY batch_drafts_select ON public.batch_drafts
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_drafts_insert ON public.batch_drafts
  WITH CHECK (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_drafts_update ON public.batch_drafts
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_drafts_delete ON public.batch_drafts
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

-- ============================================================
-- batch_jobs (4건) — current_setting 기반
-- ============================================================
ALTER POLICY batch_jobs_select ON public.batch_jobs
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_jobs_insert ON public.batch_jobs
  WITH CHECK (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_jobs_update ON public.batch_jobs
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_jobs_delete ON public.batch_jobs
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

-- ============================================================
-- batch_job_items (4건) — current_setting 기반
-- ============================================================
ALTER POLICY batch_job_items_select ON public.batch_job_items
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_job_items_insert ON public.batch_job_items
  WITH CHECK (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_job_items_update ON public.batch_job_items
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY batch_job_items_delete ON public.batch_job_items
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

-- ============================================================
-- student_change_logs (2건) — current_setting 기반
-- ============================================================
ALTER POLICY student_change_logs_select ON public.student_change_logs
  USING (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

ALTER POLICY student_change_logs_insert ON public.student_change_logs
  WITH CHECK (tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid));

-- ============================================================
-- in_app_notifications (2건) — auth.uid() 직접 사용
-- ============================================================
ALTER POLICY "Users can view own notifications" ON public.in_app_notifications
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can update own notifications" ON public.in_app_notifications
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- support_tickets (4건) — current_setting + auth.uid() 혼합
-- ============================================================
ALTER POLICY "Staff can view tenant tickets" ON public.support_tickets
  USING (
    tenant_id = ((SELECT current_setting('app.current_tenant_id', true))::uuid)
    AND deleted_at IS NULL
  );

ALTER POLICY "Users can view own tickets" ON public.support_tickets
  USING (user_id = (SELECT auth.uid()) AND deleted_at IS NULL);

ALTER POLICY "Users can create tickets" ON public.support_tickets
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "Users can update own tickets" ON public.support_tickets
  USING (user_id = (SELECT auth.uid()) AND deleted_at IS NULL);

-- ============================================================
-- kakao_alimtalk_templates (3건) — 서브쿼리 내부 auth.uid()
-- ============================================================
ALTER POLICY kakao_templates_select_policy ON public.kakao_alimtalk_templates
  USING (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
    AND deleted_at IS NULL
  );

ALTER POLICY kakao_templates_insert_policy ON public.kakao_alimtalk_templates
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
  );

ALTER POLICY kakao_templates_update_policy ON public.kakao_alimtalk_templates
  USING (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
  );

-- ============================================================
-- report_templates (4건) — 서브쿼리 내부 auth.uid()
-- ============================================================
ALTER POLICY report_templates_select ON public.report_templates
  USING (
    is_system = true
    OR tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
  );

ALTER POLICY report_templates_insert ON public.report_templates
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
    AND is_system = false
  );

ALTER POLICY report_templates_update ON public.report_templates
  USING (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
    AND is_system = false
  );

ALTER POLICY report_templates_delete ON public.report_templates
  USING (
    tenant_id = (SELECT users.tenant_id FROM public.users WHERE users.id = (SELECT auth.uid()))
    AND is_system = false
  );
