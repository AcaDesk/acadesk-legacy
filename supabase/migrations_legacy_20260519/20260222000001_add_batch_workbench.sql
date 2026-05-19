-- =============================================================================
-- Batch Workbench: batch_drafts, batch_jobs, batch_job_items
-- =============================================================================

-- 1. batch_drafts: Wizard 임시 상태 서버 저장
CREATE TABLE public.batch_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','running','archived')),
  step TEXT NOT NULL DEFAULT 'targets' CHECK (step IN ('targets','action','options','review','run')),
  action_type TEXT CHECK (action_type IN ('report','comment','send')),
  target_ids UUID[] NOT NULL DEFAULT '{}',
  target_snapshot_count INT NOT NULL DEFAULT 0,
  options JSONB DEFAULT '{}',
  schedule JSONB DEFAULT '{"mode":"now"}',
  validation JSONB DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. batch_jobs: 실행 결과 추적
CREATE TABLE public.batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  draft_id UUID REFERENCES public.batch_drafts(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('report','comment','send')),
  job_name TEXT,
  job_params JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','partial_failed','succeeded','failed','canceled')),
  progress JSONB NOT NULL DEFAULT '{"total":0,"processed":0,"success":0,"failed":0}',
  idempotency_key TEXT UNIQUE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_name TEXT
);

-- 3. batch_job_items: 항목별 결과
CREATE TABLE public.batch_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  job_id UUID NOT NULL REFERENCES public.batch_jobs(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','skipped')),
  result_data JSONB,
  error_message TEXT,
  error_category TEXT,
  retryable BOOLEAN NOT NULL DEFAULT false,
  retry_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_batch_drafts_tenant ON public.batch_drafts(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_drafts_created_by ON public.batch_drafts(tenant_id, created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_drafts_status ON public.batch_drafts(tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_batch_jobs_tenant ON public.batch_jobs(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_jobs_draft ON public.batch_jobs(draft_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_jobs_status ON public.batch_jobs(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_jobs_created_by ON public.batch_jobs(tenant_id, created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_jobs_template ON public.batch_jobs(tenant_id, is_template) WHERE is_template = true AND deleted_at IS NULL;

CREATE INDEX idx_batch_job_items_job ON public.batch_job_items(job_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_job_items_status ON public.batch_job_items(job_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_batch_job_items_target ON public.batch_job_items(tenant_id, target_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.batch_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_job_items ENABLE ROW LEVEL SECURITY;

-- batch_drafts RLS
CREATE POLICY "batch_drafts_select" ON public.batch_drafts
  FOR SELECT USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_drafts_insert" ON public.batch_drafts
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_drafts_update" ON public.batch_drafts
  FOR UPDATE USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_drafts_delete" ON public.batch_drafts
  FOR DELETE USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- batch_jobs RLS
CREATE POLICY "batch_jobs_select" ON public.batch_jobs
  FOR SELECT USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_jobs_insert" ON public.batch_jobs
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_jobs_update" ON public.batch_jobs
  FOR UPDATE USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_jobs_delete" ON public.batch_jobs
  FOR DELETE USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- batch_job_items RLS
CREATE POLICY "batch_job_items_select" ON public.batch_job_items
  FOR SELECT USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_job_items_insert" ON public.batch_job_items
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_job_items_update" ON public.batch_job_items
  FOR UPDATE USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
CREATE POLICY "batch_job_items_delete" ON public.batch_job_items
  FOR DELETE USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- =============================================================================
-- Updated_at trigger (재사용 or 생성)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_batch_drafts_updated_at
  BEFORE UPDATE ON public.batch_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_batch_jobs_updated_at
  BEFORE UPDATE ON public.batch_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_batch_job_items_updated_at
  BEFORE UPDATE ON public.batch_job_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Service role grants (for server actions using createServiceRoleClient)
-- =============================================================================

GRANT ALL ON public.batch_drafts TO service_role;
GRANT ALL ON public.batch_jobs TO service_role;
GRANT ALL ON public.batch_job_items TO service_role;
