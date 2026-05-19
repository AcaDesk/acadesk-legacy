-- =============================================================================
-- Student Change Logs: 학생 정보 변경 이력 (진급, 학교 전환, 졸업 등)
-- =============================================================================

CREATE TABLE public.student_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  change_type TEXT NOT NULL,    -- 'promotion' | 'school_transfer' | 'graduation' | 'manual_edit'
  field_name TEXT NOT NULL,     -- 'grade' | 'school'
  old_value TEXT,
  new_value TEXT,
  batch_id UUID,                -- 동일 진급 처리 건을 묶는 ID
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_student_change_logs_student
  ON public.student_change_logs(tenant_id, student_id, changed_at DESC);

CREATE INDEX idx_student_change_logs_batch
  ON public.student_change_logs(tenant_id, batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX idx_student_change_logs_type
  ON public.student_change_logs(tenant_id, change_type, changed_at DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.student_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_change_logs_select" ON public.student_change_logs
  FOR SELECT USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

CREATE POLICY "student_change_logs_insert" ON public.student_change_logs
  FOR INSERT WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Immutable: no UPDATE or DELETE policies

-- =============================================================================
-- Service role grants
-- =============================================================================

GRANT ALL ON public.student_change_logs TO service_role;
