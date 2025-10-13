-- Add enrollment status management with proper states
-- Tracks the full lifecycle of student enrollment in classes

-- 1. Add end_date field to class_enrollments if not exists
ALTER TABLE class_enrollments
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create reference table for enrollment statuses
CREATE TABLE IF NOT EXISTS ref_enrollment_statuses (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert enrollment status types
INSERT INTO ref_enrollment_statuses (code, label, description, sort_order)
VALUES
  ('active', '수강중', '현재 수강 중인 상태', 1),
  ('completed', '수강종료', '정상적으로 수강을 완료한 상태', 2),
  ('on_hold', '휴원', '일시적으로 수강을 중단한 상태', 3),
  ('withdrawn', '환불', '중도 환불로 수강을 종료한 상태', 4),
  ('transferred', '반 이동', '다른 반으로 이동한 상태', 5),
  ('pending', '대기', '수강 대기 중인 상태', 6)
ON CONFLICT (code) DO NOTHING;

-- 4. Create reference table for withdrawal reasons
CREATE TABLE IF NOT EXISTS ref_withdrawal_reasons (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert common withdrawal reasons
INSERT INTO ref_withdrawal_reasons (code, label, description, sort_order)
VALUES
  ('schedule_conflict', '시간대 불가', '시간표 충돌로 인한 환불', 1),
  ('academic_level', '수준 불일치', '수업 난이도가 맞지 않음', 2),
  ('financial', '비용 부담', '학원비 부담', 3),
  ('relocation', '이사', '거주지 이전', 4),
  ('school_change', '학교 이전', '학교 전학', 5),
  ('health', '건강 문제', '학생 건강상 이유', 6),
  ('dissatisfaction', '불만족', '수업 품질 불만족', 7),
  ('personal', '개인 사정', '기타 개인 사정', 8),
  ('other', '기타', '기타 사유', 99)
ON CONFLICT (code) DO NOTHING;

-- 6. Add index for end_date
CREATE INDEX IF NOT EXISTS idx_class_enrollments_end_date
  ON class_enrollments(end_date)
  WHERE end_date IS NOT NULL;

-- 7. Function to get student's current enrollments
CREATE OR REPLACE FUNCTION get_student_current_enrollments(p_student_id UUID)
RETURNS TABLE (
  enrollment_id UUID,
  class_id UUID,
  class_name TEXT,
  status TEXT,
  enrolled_at TIMESTAMPTZ,
  end_date DATE
) AS $$
  SELECT
    ce.id AS enrollment_id,
    ce.class_id,
    c.name AS class_name,
    ce.status,
    ce.enrolled_at,
    ce.end_date
  FROM class_enrollments ce
  JOIN classes c ON ce.class_id = c.id
  WHERE ce.student_id = p_student_id
    AND ce.tenant_id = get_current_tenant_id()
    AND (ce.end_date IS NULL OR ce.end_date >= CURRENT_DATE)
  ORDER BY ce.enrolled_at DESC;
$$ LANGUAGE SQL STABLE;

-- 8. Trigger to log enrollment status changes
CREATE OR REPLACE FUNCTION log_enrollment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_student_name TEXT;
  v_class_name TEXT;
  v_status_label TEXT;
  v_activity_title TEXT;
  v_activity_description TEXT;
BEGIN
  -- Only log if status changed
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Get student and class info
  SELECT u.name INTO v_student_name
  FROM students s
  JOIN users u ON s.user_id = u.id
  WHERE s.id = NEW.student_id;

  SELECT name INTO v_class_name
  FROM classes
  WHERE id = NEW.class_id;

  -- Get status label
  SELECT label INTO v_status_label
  FROM ref_enrollment_statuses
  WHERE code = NEW.status;

  -- Build activity log
  CASE NEW.status
    WHEN 'active' THEN
      v_activity_title := v_class_name || ' 수강 시작';
      v_activity_description := '수강을 시작했습니다';
    WHEN 'completed' THEN
      v_activity_title := v_class_name || ' 수강 완료';
      v_activity_description := '수강을 정상 완료했습니다';
    WHEN 'on_hold' THEN
      v_activity_title := v_class_name || ' 휴원';
      v_activity_description := '수강을 일시 중단했습니다';
    WHEN 'withdrawn' THEN
      v_activity_title := v_class_name || ' 환불';
      v_activity_description := COALESCE('환불 사유: ' || NEW.withdrawal_reason, '중도 환불했습니다');
    WHEN 'transferred' THEN
      v_activity_title := v_class_name || ' 반 이동';
      v_activity_description := '다른 반으로 이동했습니다';
    ELSE
      v_activity_title := v_class_name || ' 상태 변경';
      v_activity_description := '수강 상태가 ' || COALESCE(v_status_label, NEW.status) || '로 변경되었습니다';
  END CASE;

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
    'enrollment_status_change',
    CURRENT_DATE,
    v_activity_title,
    v_activity_description,
    jsonb_build_object(
      'class_id', NEW.class_id,
      'enrollment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'withdrawal_reason', NEW.withdrawal_reason
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_log_enrollment_status_change ON class_enrollments;

CREATE TRIGGER trg_log_enrollment_status_change
  AFTER INSERT OR UPDATE OF status ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION log_enrollment_status_change();

-- 9. Add comments
COMMENT ON COLUMN class_enrollments.end_date IS 'Date when enrollment ended (for completed, withdrawn, etc.)';
COMMENT ON COLUMN class_enrollments.withdrawal_reason IS 'Code referencing ref_withdrawal_reasons';
COMMENT ON COLUMN class_enrollments.notes IS 'Additional notes about enrollment status';

COMMENT ON TABLE ref_enrollment_statuses IS 'Reference table for enrollment status types';
COMMENT ON TABLE ref_withdrawal_reasons IS 'Reference table for withdrawal/refund reasons';
