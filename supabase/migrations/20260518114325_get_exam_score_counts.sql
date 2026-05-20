CREATE OR REPLACE FUNCTION public.get_exam_score_counts(
  p_tenant_id uuid,
  p_exam_ids uuid[]
)
RETURNS TABLE(exam_id uuid, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT es.exam_id, COUNT(*) AS cnt
  FROM public.exam_scores es
  WHERE es.tenant_id = p_tenant_id
    AND es.exam_id = ANY(p_exam_ids)
    AND es.deleted_at IS NULL
  GROUP BY es.exam_id;
$$;

REVOKE ALL ON FUNCTION public.get_exam_score_counts(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exam_score_counts(uuid, uuid[]) TO service_role;

COMMENT ON FUNCTION public.get_exam_score_counts(uuid, uuid[]) IS
  '시험 목록 페이지(/grades)에서 시험별 배정 학생 수(exam_scores 행 카운트)를 일괄 반환. service_role 전용.';;
