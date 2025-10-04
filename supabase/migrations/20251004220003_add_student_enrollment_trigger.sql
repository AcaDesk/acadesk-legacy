-- =====================================================
-- Add Student Enrollment Activity Log Trigger
-- =====================================================

-- Trigger: Create log when student is enrolled
CREATE OR REPLACE FUNCTION trigger_log_student_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name VARCHAR(255);
BEGIN
  -- Get student name
  SELECT name INTO v_student_name
  FROM users
  WHERE id = NEW.id;

  -- Create enrollment activity log
  PERFORM create_student_activity_log(
    p_student_id := NEW.id,
    p_activity_type := 'enrollment',
    p_title := '학원 입회',
    p_description := format('학생 코드: %s', NEW.student_code),
    p_activity_date := NEW.enrollment_date::TIMESTAMPTZ,
    p_metadata := jsonb_build_object(
      'student_code', NEW.student_code,
      'grade', NEW.grade,
      'school', NEW.school
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_student_insert
  AFTER INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_student_enrollment();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION trigger_log_student_enrollment() IS '학생 등록 시 입회 활동 로그를 자동으로 생성하는 트리거 함수';
