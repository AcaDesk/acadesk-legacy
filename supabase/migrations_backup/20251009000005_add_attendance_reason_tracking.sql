-- Add attendance reason tracking
-- Allows staff to record detailed reasons for absences, tardiness, and early departures

-- 1. Add reason fields to attendance
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS absence_reason TEXT,
  ADD COLUMN IF NOT EXISTS late_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes_detail TEXT;

-- 2. Create reference table for common absence reasons
CREATE TABLE IF NOT EXISTS ref_absence_reasons (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT CHECK (category IN ('excused', 'unexcused')),
  requires_documentation BOOLEAN DEFAULT false,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert common absence reasons
INSERT INTO ref_absence_reasons (code, label, category, requires_documentation, description, sort_order)
VALUES
  -- Excused absences
  ('sick', '병결', 'excused', true, '질병으로 인한 결석', 1),
  ('hospital', '병원 진료', 'excused', true, '병원 진료 및 치료', 2),
  ('family_event', '가족 행사', 'excused', false, '가족 경조사 및 중요 행사', 3),
  ('school_event', '학교 행사', 'excused', false, '학교 공식 행사 참여', 4),
  ('school_exam', '학교 시험', 'excused', false, '학교 정기고사 및 모의고사', 5),
  ('emergency', '긴급 상황', 'excused', false, '가족 긴급 상황', 6),
  ('weather', '기상 악화', 'excused', false, '태풍, 폭설 등 기상 악화', 7),

  -- Unexcused absences
  ('personal', '개인 사정', 'unexcused', false, '개인적인 사유', 101),
  ('oversleep', '늦잠', 'unexcused', false, '늦잠으로 인한 결석', 102),
  ('forgot', '깜빡함', 'unexcused', false, '수업을 잊어버림', 103),
  ('no_reason', '무단 결석', 'unexcused', false, '사전 연락 없는 결석', 104),
  ('other', '기타', 'unexcused', false, '기타 사유', 999)
ON CONFLICT (code) DO NOTHING;

-- 4. Create reference table for tardiness reasons
CREATE TABLE IF NOT EXISTS ref_tardiness_reasons (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert common tardiness reasons
INSERT INTO ref_tardiness_reasons (code, label, description, sort_order)
VALUES
  ('traffic', '교통 체증', '교통 혼잡으로 인한 지각', 1),
  ('bus_delay', '버스 지연', '셔틀버스 지연', 2),
  ('oversleep', '늦잠', '늦잠으로 인한 지각', 3),
  ('school_delay', '학교 일정', '학교 일정이 늦게 끝남', 4),
  ('personal', '개인 사정', '개인적인 사유', 5),
  ('other', '기타', '기타 사유', 99)
ON CONFLICT (code) DO NOTHING;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_absence_reason
  ON attendance(absence_reason)
  WHERE status = 'absent';

CREATE INDEX IF NOT EXISTS idx_attendance_late_reason
  ON attendance(late_reason)
  WHERE status = 'late';

-- 7. Update activity log trigger to include reason information
CREATE OR REPLACE FUNCTION log_attendance_to_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_class_name TEXT;
  v_session_date DATE;
  v_activity_title TEXT;
  v_activity_description TEXT;
  v_metadata JSONB;
  v_absence_label TEXT;
  v_late_label TEXT;
BEGIN
  -- Get student and class info
  SELECT u.name INTO v_student_name
  FROM students s
  JOIN users u ON s.user_id = u.id
  WHERE s.id = NEW.student_id;

  SELECT c.name, ats.session_date
  INTO v_class_name, v_session_date
  FROM attendance_sessions ats
  JOIN classes c ON ats.class_id = c.id
  WHERE ats.id = NEW.session_id;

  -- Get reason labels if present
  IF NEW.absence_reason IS NOT NULL THEN
    SELECT label INTO v_absence_label
    FROM ref_absence_reasons
    WHERE code = NEW.absence_reason;
  END IF;

  IF NEW.late_reason IS NOT NULL THEN
    SELECT label INTO v_late_label
    FROM ref_tardiness_reasons
    WHERE code = NEW.late_reason;
  END IF;

  -- Build title and description based on status
  CASE NEW.status
    WHEN 'present' THEN
      v_activity_title := v_class_name || ' 출석';
      v_activity_description := '정상 출석';
    WHEN 'late' THEN
      v_activity_title := v_class_name || ' 지각';
      v_activity_description := COALESCE('지각 사유: ' || v_late_label, '지각');
    WHEN 'absent' THEN
      v_activity_title := v_class_name || ' 결석';
      v_activity_description := COALESCE('결석 사유: ' || v_absence_label, '결석');
    ELSE
      v_activity_title := v_class_name || ' 출석 기록';
      v_activity_description := '출석 상태: ' || NEW.status;
  END CASE;

  -- Build metadata
  v_metadata := jsonb_build_object(
    'status', NEW.status,
    'class_id', (SELECT class_id FROM attendance_sessions WHERE id = NEW.session_id),
    'session_id', NEW.session_id
  );

  IF NEW.absence_reason IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('absence_reason', NEW.absence_reason);
  END IF;

  IF NEW.late_reason IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('late_reason', NEW.late_reason);
  END IF;

  IF NEW.check_in_at IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('check_in_time', NEW.check_in_at);
  END IF;

  -- Create activity log
  INSERT INTO student_activity_logs (
    tenant_id,
    student_id,
    activity_type,
    activity_date,
    title,
    description,
    metadata
  ) VALUES (
    NEW.tenant_id,
    NEW.student_id,
    'attendance',
    v_session_date,
    v_activity_title,
    v_activity_description,
    v_metadata
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with new function
DROP TRIGGER IF EXISTS trg_log_attendance_to_activity ON attendance;
CREATE TRIGGER trg_log_attendance_to_activity
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION log_attendance_to_activity();

-- 8. Add comments
COMMENT ON COLUMN attendance.absence_reason IS 'Code referencing ref_absence_reasons for absence explanation';
COMMENT ON COLUMN attendance.late_reason IS 'Code referencing ref_tardiness_reasons for tardiness explanation';
COMMENT ON COLUMN attendance.notes_detail IS 'Additional detailed notes about attendance';

COMMENT ON TABLE ref_absence_reasons IS 'Reference table for standardized absence reasons';
COMMENT ON TABLE ref_tardiness_reasons IS 'Reference table for standardized tardiness reasons';
COMMENT ON COLUMN ref_absence_reasons.requires_documentation IS 'Whether this reason requires supporting documentation (e.g., doctor note)';
