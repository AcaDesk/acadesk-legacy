-- 중복 인덱스 제거
-- 페어 인덱스와 컬럼/조건이 완전 동일한 인덱스를 삭제하여 쓰기 오버헤드 감소.
-- Supabase performance advisor (duplicate_index) 3건 해결.

DROP INDEX IF EXISTS public.idx_consult_tenant_date;
-- 동일: idx_consultations_tenant_date (tenant_id, consultation_date DESC) WHERE deleted_at IS NULL

DROP INDEX IF EXISTS public.idx_notif_logs_student;
-- 동일: idx_notification_logs_student (student_id, sent_at DESC)

DROP INDEX IF EXISTS public.idx_students_tenant_created;
-- 동일: idx_students_tenant_created_desc_active (tenant_id, created_at DESC) WHERE deleted_at IS NULL
