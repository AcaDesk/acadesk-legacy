-- ============================================================================
-- Migration: Add Exam Improvements
-- Date: 2025-01-30
-- Description:
--   1. Add subject_id to exams (link exams to subjects)
--   2. Add status field to exams
--   3. Add status field to exam_scores (absent, retest_required, etc.)
--   4. Add passing_score to exams (for auto retest logic)
-- ============================================================================

-- ============================================================================
-- 1. Add subject_id to exams table
-- ============================================================================

-- Add subject_id column
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_subject
  ON public.exams(subject_id)
  WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN public.exams.subject_id IS '과목 ID (Voca, Reading, Speaking 등)';


-- ============================================================================
-- 2. Add status to exams table
-- ============================================================================

-- Add status column with CHECK constraint
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

-- Add index
CREATE INDEX IF NOT EXISTS idx_exams_status
  ON public.exams(status)
  WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN public.exams.status IS '시험 상태: scheduled(예정), in_progress(진행중), completed(완료), cancelled(취소)';


-- ============================================================================
-- 3. Add status to exam_scores table
-- ============================================================================

-- Add status column with CHECK constraint
ALTER TABLE public.exam_scores
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted'
    CHECK (status IN ('absent', 'pending', 'submitted', 'retest_required', 'retest_waived'));

-- Add index
CREATE INDEX IF NOT EXISTS idx_exam_scores_status
  ON public.exam_scores(status)
  WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN public.exam_scores.status IS '성적 상태: absent(미응시), pending(대기-연기), submitted(제출), retest_required(재시험필요), retest_waived(재시험면제)';


-- ============================================================================
-- 4. Ensure passing_score exists in exams (already in schema but double-check)
-- ============================================================================

-- This should already exist from 038_exams.sql, but we check
-- ALTER TABLE public.exams
--   ADD COLUMN IF NOT EXISTS passing_score NUMERIC(5,2);

COMMENT ON COLUMN public.exams.passing_score IS '합격 점수 (%). 이 점수 미달 시 자동으로 재시험 대상이 됨';


-- ============================================================================
-- 5. Create helper function: Auto-assign retest status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_mark_retest()
RETURNS TRIGGER AS $$
BEGIN
  -- If score percentage is below passing_score, mark as retest_required
  IF NEW.percentage IS NOT NULL AND NEW.status = 'submitted' THEN
    -- Get passing_score from exams table
    DECLARE
      v_passing_score NUMERIC(5,2);
    BEGIN
      SELECT passing_score INTO v_passing_score
      FROM public.exams
      WHERE id = NEW.exam_id;

      -- If passing_score is set and score is below it, mark for retest
      IF v_passing_score IS NOT NULL AND NEW.percentage < v_passing_score THEN
        NEW.status := 'retest_required';
        NEW.is_retest := false; -- This is the original test, not a retest
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_check_retest ON public.exam_scores;
CREATE TRIGGER trigger_check_retest
  BEFORE INSERT OR UPDATE OF percentage, status
  ON public.exam_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_mark_retest();

COMMENT ON FUNCTION public.check_and_mark_retest() IS '합격 점수 미달 시 자동으로 재시험 대상으로 마킹';


-- ============================================================================
-- 6. Create view: Students requiring retest
-- ============================================================================

CREATE OR REPLACE VIEW public.students_requiring_retest AS
SELECT
  es.id AS exam_score_id,
  es.exam_id,
  es.student_id,
  e.name AS exam_name,
  e.exam_date,
  e.passing_score,
  es.percentage AS student_score,
  es.status,
  es.retest_count,
  s.student_code,
  u.name AS student_name,
  s.grade,
  c.name AS class_name,
  e.tenant_id
FROM public.exam_scores es
INNER JOIN public.exams e ON e.id = es.exam_id
INNER JOIN public.students s ON s.id = es.student_id
INNER JOIN public.users u ON u.id = s.user_id
LEFT JOIN public.classes c ON c.id = e.class_id
WHERE
  es.status = 'retest_required'
  AND es.deleted_at IS NULL
  AND e.deleted_at IS NULL
  AND s.deleted_at IS NULL
ORDER BY e.exam_date DESC, u.name;

COMMENT ON VIEW public.students_requiring_retest IS '재시험 대상 학생 목록 뷰';

-- Grant permissions
GRANT SELECT ON public.students_requiring_retest TO authenticated;


-- ============================================================================
-- 7. Create function: Get monthly subject scores for student
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_subject_scores(
  p_student_id UUID,
  p_year_month TEXT -- Format: 'YYYY-MM'
)
RETURNS TABLE (
  subject_id UUID,
  subject_name TEXT,
  subject_code TEXT,
  avg_score NUMERIC,
  total_exams BIGINT,
  improvement_from_prev_month NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH current_month AS (
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      AVG(es.percentage) AS avg_score,
      COUNT(es.id) AS total_exams
    FROM public.subjects s
    LEFT JOIN public.exams e ON e.subject_id = s.id
    LEFT JOIN public.exam_scores es ON es.exam_id = e.id AND es.student_id = p_student_id
    WHERE
      TO_CHAR(e.exam_date, 'YYYY-MM') = p_year_month
      AND es.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND es.status = 'submitted' -- Only count submitted scores
    GROUP BY s.id, s.name, s.code
  ),
  prev_month AS (
    SELECT
      s.id AS subject_id,
      AVG(es.percentage) AS avg_score
    FROM public.subjects s
    LEFT JOIN public.exams e ON e.subject_id = s.id
    LEFT JOIN public.exam_scores es ON es.exam_id = e.id AND es.student_id = p_student_id
    WHERE
      TO_CHAR(e.exam_date, 'YYYY-MM') = TO_CHAR((p_year_month || '-01')::DATE - INTERVAL '1 month', 'YYYY-MM')
      AND es.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND es.status = 'submitted'
    GROUP BY s.id
  )
  SELECT
    cm.subject_id,
    cm.subject_name,
    cm.subject_code,
    ROUND(cm.avg_score, 2) AS avg_score,
    cm.total_exams,
    ROUND(cm.avg_score - COALESCE(pm.avg_score, 0), 2) AS improvement_from_prev_month
  FROM current_month cm
  LEFT JOIN prev_month pm ON pm.subject_id = cm.subject_id
  WHERE cm.total_exams > 0
  ORDER BY cm.subject_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_monthly_subject_scores(UUID, TEXT) IS '학생의 월별 과목 성적 평균 및 전월 대비 변화';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_monthly_subject_scores(UUID, TEXT) TO authenticated;


-- ============================================================================
-- End of Migration
-- ============================================================================
