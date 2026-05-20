-- SECURITY DEFINER 함수의 public(anon/authenticated) EXECUTE 권한 회수
--
-- (A) Server Action(service_role)에서만 호출 → anon + authenticated 모두 REVOKE
--     - public.get_student_detail(uuid, uuid)
--     - public.log_student_activity(...)
-- (B) RLS 정책 내부에서만 평가 → anon REVOKE, authenticated 유지
--     - public.current_user_role()
--     - public.current_user_tenant_id()

-- search_path 고정 (idempotent)
ALTER FUNCTION public.current_user_role()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.current_user_tenant_id()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.log_student_activity(
  p_tenant_id uuid, p_student_id uuid, p_activity_type text,
  p_title text, p_description text, p_metadata jsonb,
  p_activity_date timestamp with time zone, p_created_by uuid
)
  SET search_path = pg_catalog, public;

-- (A) Server Action 전용 함수: anon + authenticated REVOKE
REVOKE EXECUTE ON FUNCTION public.get_student_detail(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_detail(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_student_detail(uuid, uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.log_student_activity(
  uuid, uuid, text, text, text, jsonb, timestamp with time zone, uuid
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_student_activity(
  uuid, uuid, text, text, text, jsonb, timestamp with time zone, uuid
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_student_activity(
  uuid, uuid, text, text, text, jsonb, timestamp with time zone, uuid
) FROM authenticated;

-- (B) RLS 헬퍼 함수: anon 만 REVOKE
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;

REVOKE EXECUTE ON FUNCTION public.current_user_tenant_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_tenant_id() FROM anon;;
