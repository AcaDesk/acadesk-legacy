-- =====================================================
-- Backfill Student Enrollment Activity Logs
-- 기존 학생들의 입회 활동 로그를 소급 생성
-- =====================================================

DO $$
DECLARE
  v_student RECORD;
BEGIN
  -- 모든 기존 학생에 대해 입회 활동 로그 생성
  FOR v_student IN
    SELECT s.id, s.student_code, s.grade, s.school, s.enrollment_date, s.tenant_id
    FROM students s
    WHERE s.deleted_at IS NULL
    AND NOT EXISTS (
      -- 이미 입회 로그가 있는 학생은 제외
      SELECT 1 FROM student_activity_logs sal
      WHERE sal.student_id = s.id
      AND sal.activity_type = 'enrollment'
    )
  LOOP
    -- 입회 활동 로그 생성
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata
    ) VALUES (
      v_student.tenant_id,
      v_student.id,
      'enrollment',
      v_student.enrollment_date::TIMESTAMPTZ,
      '학원 입회',
      format('학생 코드: %s', v_student.student_code),
      jsonb_build_object(
        'student_code', v_student.student_code,
        'grade', v_student.grade,
        'school', v_student.school,
        'backfilled', true
      )
    );
  END LOOP;

  RAISE NOTICE 'Backfilled enrollment logs for existing students';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE student_activity_logs IS '학생 활동 로그 테이블 - 기존 학생 입회 기록 소급 적용 완료';
