-- 직전 마이그레이션(revoke_security_definer_public_exec)에서 REVOKE FROM PUBLIC 이
-- log_student_activity 의 service_role 권한까지 제거함.
-- (원본 마이그레이션이 service_role 에 명시적 GRANT 를 부여하지 않고 PUBLIC default 에 의존)
-- Server Action 에서 호출 가능하도록 service_role EXECUTE 복구.

GRANT EXECUTE ON FUNCTION public.log_student_activity(
  uuid, uuid, text, text, text, jsonb, timestamp with time zone, uuid
) TO service_role;;
