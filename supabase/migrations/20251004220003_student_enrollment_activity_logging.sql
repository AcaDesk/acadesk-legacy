-- Consolidated student enrollment activity logging setup
-- Combines enrollment trigger and activity type fixes

-- First ensure the enrollment activity type exists
INSERT INTO ref_activity_types (code, name, description, category, is_system_generated)
VALUES ('enrollment', '수업 등록', '학생이 수업에 등록됨', 'academic', true)
ON CONFLICT (code) DO NOTHING;

-- Create or replace the enrollment trigger
CREATE OR REPLACE FUNCTION log_student_enrollment_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log for active enrollments
  IF NEW.status = 'active' THEN
    INSERT INTO student_activity_logs (
      student_id,
      activity_type,
      activity_data,
      created_at,
      tenant_id
    )
    VALUES (
      NEW.student_id,
      'enrollment',
      jsonb_build_object(
        'class_id', NEW.class_id,
        'enrollment_id', NEW.id,
        'enrolled_at', NEW.enrolled_at
      ),
      CURRENT_TIMESTAMP,
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
  activity_data,
  created_at,
  tenant_id
)
SELECT
  ce.student_id,
  'enrollment',
  jsonb_build_object(
    'class_id', ce.class_id,
    'enrollment_id', ce.id,
    'enrolled_at', ce.enrolled_at,
    'backfilled', true
  ),
  ce.enrolled_at,
  ce.tenant_id
FROM class_enrollments ce
LEFT JOIN student_activity_logs sal ON
  sal.student_id = ce.student_id AND
  sal.activity_type = 'enrollment' AND
  sal.activity_data->>'enrollment_id' = ce.id::text
WHERE ce.status = 'active'
  AND ce.deleted_at IS NULL
  AND sal.id IS NULL  -- Only insert if not already logged
ON CONFLICT DO NOTHING;