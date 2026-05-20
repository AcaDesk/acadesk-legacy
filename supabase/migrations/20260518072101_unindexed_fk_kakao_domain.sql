CREATE INDEX IF NOT EXISTS idx_kakao_alimtalk_templates_shared_template_id
  ON public.kakao_alimtalk_templates (shared_template_id)
  WHERE shared_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_event_subscriptions_kakao_template_id
  ON public.tenant_event_subscriptions (kakao_template_id)
  WHERE kakao_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_event_subscriptions_shared_template_id
  ON public.tenant_event_subscriptions (shared_template_id)
  WHERE shared_template_id IS NOT NULL;;
