-- 잉여 인덱스 제거 (옵션 A — 보수적)
-- 각 인덱스가 다른 인덱스의 leftmost prefix 또는 superset 으로 완전히 커버되는지
-- 확인하고 안전하게 제거. 쿼리 plan 변경 없이 쓰기 오버헤드만 감소.

-- message_templates ----------------------------------------------------------
-- idx_message_templates_tenant_id(tenant_id)
-- → idx_message_templates_tenant_name_unique(tenant_id, name) UNIQUE 또는
--   idx_message_templates_tenant(tenant_id, deleted_at) WHERE deleted_at IS NULL
--   의 leftmost prefix 로 커버.
DROP INDEX IF EXISTS public.idx_message_templates_tenant_id;

-- idx_message_templates_deleted_at(deleted_at) WHERE deleted_at IS NULL
-- → partial WHERE 컬럼과 인덱스 컬럼이 동일. 모든 row 가 NULL 값이라 카디널리티 1.
DROP INDEX IF EXISTS public.idx_message_templates_deleted_at;

-- kakao_alimtalk_templates ---------------------------------------------------
-- idx_kakao_templates_tenant(tenant_id) WHERE deleted_at IS NULL
-- → idx_kakao_templates_status(tenant_id, status) WHERE deleted_at IS NULL 의
--   leftmost prefix 로 커버.
DROP INDEX IF EXISTS public.idx_kakao_templates_tenant;

-- support_tickets ------------------------------------------------------------
-- idx_support_tickets_tenant(tenant_id) WHERE deleted_at IS NULL
-- → idx_support_tickets_status(tenant_id, status) WHERE deleted_at IS NULL 의
--   leftmost prefix 로 커버.
DROP INDEX IF EXISTS public.idx_support_tickets_tenant;

-- consultations --------------------------------------------------------------
-- idx_consult_student(student_id) WHERE deleted_at IS NULL
-- → idx_consultations_student_date(student_id, consultation_date DESC)
--   WHERE deleted_at IS NULL 의 leftmost prefix 로 커버.
DROP INDEX IF EXISTS public.idx_consult_student;
