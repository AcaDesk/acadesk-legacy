-- Add pause/resume flag for recurring exam templates
-- Purpose: allow temporarily disabling auto-generation without deleting template configuration

ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS is_template_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.exams.is_template_active IS
'반복 시험 템플릿 활성 상태. false면 자동 생성 대상에서 제외(수동 생성은 가능)';

-- Backfill safety for legacy rows (in case of historical nulls)
UPDATE public.exams
SET is_template_active = true
WHERE is_template_active IS NULL;

-- Helpful index for automation queries
CREATE INDEX IF NOT EXISTS idx_exams_recurring_active
  ON public.exams (tenant_id, is_recurring, is_template_active)
  WHERE deleted_at IS NULL;
