-- 카카오 알림톡 템플릿 테이블에 service_role 권한 부여
--
-- 문제: createServiceRoleClient()로 INSERT 시 Postgres 42501(insufficient_privilege) 발생
--       → getErrorMessage() 가 "권한이 없습니다" 로 매핑 → 템플릿 등록 실패
-- 원인: 20251218000002_add_kakao_alimtalk_config.sql 에서 authenticated 에만 GRANT,
--       service_role 누락
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kakao_alimtalk_templates TO service_role;
