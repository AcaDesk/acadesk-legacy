-- /grades 시험 목록의 "응시 인원" 카운트가 0으로 표시되던 버그 수정.
--
-- 기존 코드는 supabase-js .select('exam_id').in('exam_id', examIds) 결과 행을 클라이언트에서
-- 합산했는데, supabase-js 기본 행 제한(1000)에 걸려 학원의 누적 점수 행(수천~수십만)이
-- 절단되며 카운트가 0으로 보이는 시험이 다수 발생했음.
--
-- 이 함수는 service_role 환경에서만 호출되며, 한 번의 GROUP BY 집계로 모든 시험의 카운트를 반환.
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

-- service_role 만 접근 가능하도록 명시적으로 권한 부여 (PUBLIC default 회피)
REVOKE ALL ON FUNCTION public.get_exam_score_counts(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_exam_score_counts(uuid, uuid[]) TO service_role;

COMMENT ON FUNCTION public.get_exam_score_counts(uuid, uuid[]) IS
  '시험 목록 페이지(/grades)에서 시험별 배정 학생 수(exam_scores 행 카운트)를 일괄 반환. service_role 전용.';
