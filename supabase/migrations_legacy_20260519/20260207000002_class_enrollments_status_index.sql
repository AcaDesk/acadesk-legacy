-- ============================================================================
-- Class Enrollments Status Index
-- ============================================================================
-- 출석 페이지에서 class_id + status로 조회하는 쿼리 최적화
-- 기존 인덱스: (class_id, student_id) WHERE status = 'active'
-- 실제 쿼리: WHERE class_id = ? AND status = 'active'

-- 복합 인덱스: 출석 페이지 학생 목록 조회 최적화
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_enrollments_class_status
  ON class_enrollments(class_id, status)
  INCLUDE (student_id);

-- tenant_id 포함 버전 (RLS 정책과 함께 사용 시 더 효율적)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_enrollments_tenant_class_status
  ON class_enrollments(tenant_id, class_id, status)
  INCLUDE (student_id);

-- ============================================================================
-- Verification Query
-- ============================================================================
-- EXPLAIN ANALYZE
-- SELECT student_id, students.id, students.student_code, users.name
-- FROM class_enrollments
-- JOIN students ON students.id = class_enrollments.student_id
-- JOIN users ON users.id = students.user_id
-- WHERE class_enrollments.class_id = '<uuid>'
-- AND class_enrollments.status = 'active';
