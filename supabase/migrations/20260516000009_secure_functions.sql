-- 함수 보안 강화 (옵션 E1 - Part 1)
--
-- 1. search_path 명시 — function_search_path_mutable 10건 해소
--    (get_student_detail 은 이전 마이그레이션에서 처리됨)
-- 2. anon EXECUTE 권한 회수 — SECURITY DEFINER 함수 중 RPC 직접 호출 없는 것
--    (current_user_role/tenant_id 는 RLS 정책 내부에서 평가되므로 유지)

-- ============================================================
-- search_path 고정
-- ============================================================

ALTER FUNCTION public.current_user_role()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.current_user_tenant_id()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.update_kakao_templates_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.check_and_mark_retest()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.show_current_user()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.get_monthly_subject_scores(p_student_id uuid, p_year_month text)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.set_attendance_date()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.set_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.fn_student_tasks_normalize_dow()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.log_student_activity(
  p_tenant_id uuid, p_student_id uuid, p_activity_type text,
  p_title text, p_description text, p_metadata jsonb,
  p_activity_date timestamp with time zone, p_created_by uuid
)
  SET search_path = pg_catalog, public;

-- ============================================================
-- anon EXECUTE 권한 회수 (SECURITY DEFINER)
-- ============================================================
-- get_student_detail / log_student_activity 는 Server Action 에서만 호출.
-- anon /rest/v1/rpc/ 경유 호출 차단.

REVOKE EXECUTE ON FUNCTION public.get_student_detail(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_student_activity(
  uuid, uuid, text, text, text, jsonb, timestamp with time zone, uuid
) FROM anon;
