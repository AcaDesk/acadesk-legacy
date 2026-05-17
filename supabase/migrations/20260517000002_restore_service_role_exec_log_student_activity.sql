-- 직전 마이그레이션(20260517000001)에서 REVOKE EXECUTE ... FROM PUBLIC 이
-- log_student_activity 의 service_role EXECUTE 권한까지 제거함.
--
-- 원인: log_student_activity 는 원본 정의 시 service_role 에 명시적 GRANT 가
-- 부여되지 않아 PUBLIC default grant 에 의존했음.
-- get_student_detail 은 명시적 GRANT 가 있어 영향 없음.
--
-- Server Action(service_role) 에서 호출 가능하도록 EXECUTE 복구.

GRANT EXECUTE ON FUNCTION public.log_student_activity(
  uuid, uuid, text, text, text, jsonb, timestamp with time zone, uuid
) TO service_role;
