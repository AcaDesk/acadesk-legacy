-- 누락된 service_role GRANT 일괄 보강
--
-- 문제: createServiceRoleClient()를 사용하는 Server Action이 아래 테이블에
--       SELECT/INSERT/UPDATE/DELETE 시 Postgres 42501(insufficient_privilege) 발생
--       → getErrorMessage() 가 "권한이 없습니다" 로 매핑 → 사용자 실패
-- 원인: 각 테이블의 최초 마이그레이션에서 authenticated/anon 에만 GRANT,
--       service_role 누락 (kakao_alimtalk_templates 와 동일 패턴)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_notes        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_participants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ref_activity_types        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_templates          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_activity_logs     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teaching_resources        TO service_role;
