-- Consolidated student enrollment activity logging setup
-- Combines enrollment trigger and activity type fixes

-- First ensure the enrollment activity type exists
INSERT INTO ref_activity_types (code, label, description, icon, color, sort_order)
VALUES ('enrollment', '수업 등록', '학생이 수업에 등록됨', 'BookOpen', 'secondary', 32)
ON CONFLICT (code) DO NOTHING;

-- Create or replace the enrollment trigger
CREATE OR REPLACE FUNCTION log_student_enrollment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_class_name VARCHAR(255);
BEGIN
  -- Only log for active enrollments
  IF NEW.status = 'active' THEN
    -- Get class name
    SELECT name INTO v_class_name FROM classes WHERE id = NEW.class_id;

    INSERT INTO student_activity_logs (
      student_id,
      activity_type,
      title,
      description,
      activity_date,
      metadata,
      related_class_id,
      tenant_id
    )
    VALUES (
      NEW.student_id,
      'enrollment',
      COALESCE(v_class_name, '수업'),
      '수업 등록',
      COALESCE(NEW.enrolled_at, CURRENT_TIMESTAMP),
      jsonb_build_object(
        'class_id', NEW.class_id,
        'enrollment_id', NEW.id,
        'enrolled_at', NEW.enrolled_at
      ),
      NEW.class_id,
      NEW.tenant_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS log_student_enrollment ON class_enrollments;
CREATE TRIGGER log_student_enrollment
  AFTER INSERT ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION log_student_enrollment_activity();

-- Backfill historical enrollment data
INSERT INTO student_activity_logs (
  student_id,
  activity_type,
  title,
  description,
  activity_date,
  metadata,
  related_class_id,
  tenant_id
)
SELECT
  ce.student_id,
  'enrollment',
  COALESCE(c.name, '수업'),
  '수업 등록',
  COALESCE(ce.enrolled_at, ce.created_at),
  jsonb_build_object(
    'class_id', ce.class_id,
    'enrollment_id', ce.id,
    'enrolled_at', ce.enrolled_at,
    'backfilled', true
  ),
  ce.class_id,
  ce.tenant_id
FROM class_enrollments ce
LEFT JOIN classes c ON c.id = ce.class_id
LEFT JOIN student_activity_logs sal ON
  sal.student_id = ce.student_id AND
  sal.activity_type = 'enrollment' AND
  sal.metadata->>'enrollment_id' = ce.id::text
WHERE ce.status = 'active'
  AND sal.id IS NULL  -- Only insert if not already logged
ON CONFLICT DO NOTHING;