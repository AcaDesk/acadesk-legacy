-- exam_scores KPI 쿼리 패턴 최적화
-- 대상: WHERE tenant_id = $1 AND created_at BETWEEN ... AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_exam_scores_tenant_created
  ON public.exam_scores (tenant_id, created_at)
  WHERE deleted_at IS NULL;

ANALYZE public.exam_scores;;
