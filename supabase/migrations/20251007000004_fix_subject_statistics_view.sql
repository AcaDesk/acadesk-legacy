-- Fix subject_statistics view to include sort_order column
-- 과목 통계 뷰에 정렬 순서 컬럼 추가

-- 기존 뷰 삭제
DROP VIEW IF EXISTS subject_statistics;

-- 뷰 재생성 (sort_order, active 포함)
CREATE OR REPLACE VIEW subject_statistics AS
SELECT
  s.id,
  s.tenant_id,
  s.name,
  s.color,
  s.sort_order,
  s.active,
  COUNT(DISTINCT c.id) AS class_count
FROM subjects s
LEFT JOIN classes c ON c.subject_id = s.id AND c.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.tenant_id, s.name, s.color, s.sort_order, s.active;

-- 코멘트 재설정
COMMENT ON VIEW subject_statistics IS '과목별 통계 (수업 수) - 정렬 순서 포함';
