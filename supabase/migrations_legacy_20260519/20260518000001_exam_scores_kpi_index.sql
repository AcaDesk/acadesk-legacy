-- exam_scores KPI 쿼리 패턴 최적화
--
-- 대상 쿼리 (dashboard-kpi.ts:89-96):
--   SELECT percentage FROM exam_scores
--   WHERE tenant_id = $1
--     AND created_at >= $2
--     AND created_at <= $3
--     AND deleted_at IS NULL
--
-- 진단 결과 (2026-05-18):
--   - mean_exec_time 12.19ms × 1253 calls = 누적 15.3초/day (dashboard KPI 부하)
--   - 기존 idx_exam_scores_tenant_id 는 created_at 범위를 처리하지 못해 Filter 단계에서
--     불필요한 row 스캔. 복합 인덱스로 range scan 최적화.
--   - last_analyze NULL → 통계 stale → planner 부정확. ANALYZE 도 함께 실행.

CREATE INDEX IF NOT EXISTS idx_exam_scores_tenant_created
  ON public.exam_scores (tenant_id, created_at)
  WHERE deleted_at IS NULL;

ANALYZE public.exam_scores;
