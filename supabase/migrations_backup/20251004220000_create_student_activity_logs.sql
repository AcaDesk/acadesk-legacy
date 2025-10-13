-- =====================================================
-- Student Activity Logs
-- 학생의 모든 활동을 통합적으로 기록하는 로그 테이블
-- =====================================================

-- Activity Types Reference Table
CREATE TABLE ref_activity_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- lucide icon name
  color VARCHAR(50), -- badge color variant
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_activity_types (code, label, description, icon, color, sort_order) VALUES
  -- Academic Activities
  ('exam_score', '시험 응시', '시험 점수 기록', 'GraduationCap', 'default', 10),
  ('homework_submit', '과제 제출', '과제/TODO 완료', 'CheckCircle', 'default', 20),
  ('class_enroll', '수업 등록', '새로운 반/수업 등록', 'BookOpen', 'secondary', 30),
  ('class_complete', '수업 수료', '수업 과정 완료', 'Award', 'default', 31),

  -- Attendance Activities
  ('attendance_present', '출석', '정상 출석', 'CheckCircle', 'default', 40),
  ('attendance_late', '지각', '지각 기록', 'Clock', 'outline', 41),
  ('attendance_absent', '결석', '결석 기록', 'XCircle', 'destructive', 42),

  -- Consultation & Communication
  ('consultation', '상담', '학부모/학생 상담', 'MessageCircle', 'secondary', 50),
  ('report_generate', '리포트 발송', '학습 리포트 생성/발송', 'FileText', 'default', 51),
  ('notification_sent', '알림 발송', '학부모 알림 전송', 'Send', 'outline', 52),

  -- Library & Materials
  ('library_borrow', '도서 대여', '원서/교재 대여', 'Book', 'secondary', 60),
  ('library_return', '도서 반납', '원서/교재 반납', 'BookCheck', 'default', 61),
  ('library_overdue', '반납 연체', '반납 기한 초과', 'AlertCircle', 'destructive', 62),
  ('material_assign', '교재 배부', '교재/자료 배부', 'Package', 'secondary', 63),

  -- Payment & Billing
  ('payment_made', '수강료 납부', '수강료/교재비 납부', 'CreditCard', 'default', 70),
  ('invoice_issued', '청구서 발행', '청구서 발행', 'Receipt', 'outline', 71),
  ('refund_issued', '환불 처리', '수강료 환불', 'ArrowLeftCircle', 'outline', 72),

  -- Student Lifecycle
  ('student_enroll', '학원 입회', '학원 등록', 'UserPlus', 'default', 80),
  ('student_withdraw', '학원 퇴원', '학원 탈퇴', 'UserMinus', 'destructive', 81),
  ('profile_update', '프로필 수정', '학생 정보 변경', 'Edit', 'outline', 82),

  -- Others
  ('note_added', '메모 추가', '관리자 메모 작성', 'StickyNote', 'outline', 90),
  ('custom', '기타', '기타 활동', 'Info', 'outline', 99);

-- Main Activity Logs Table
CREATE TABLE student_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Activity Details
  activity_type VARCHAR(50) NOT NULL REFERENCES ref_activity_types(code),
  activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  title VARCHAR(255) NOT NULL, -- 활동 제목 (예: "중간고사 수학 시험")
  description TEXT, -- 상세 설명 (옵션)

  -- Related Entities (nullable foreign keys)
  related_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  related_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  related_todo_id UUID REFERENCES student_todos(id) ON DELETE SET NULL,
  related_consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  related_library_id UUID, -- library_loans 테이블 생성 후 추가
  related_payment_id UUID, -- payments 테이블 생성 후 추가

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- 추가 데이터 (점수, 금액 등)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- 기록 작성자

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_student_activity_logs_tenant_id ON student_activity_logs(tenant_id);
CREATE INDEX idx_student_activity_logs_student_id ON student_activity_logs(student_id);
CREATE INDEX idx_student_activity_logs_activity_type ON student_activity_logs(activity_type);
CREATE INDEX idx_student_activity_logs_activity_date ON student_activity_logs(activity_date DESC);
CREATE INDEX idx_student_activity_logs_deleted_at ON student_activity_logs(deleted_at);

-- Composite index for common queries
CREATE INDEX idx_student_activity_logs_student_date ON student_activity_logs(student_id, activity_date DESC) WHERE deleted_at IS NULL;

-- Auto-update trigger
CREATE TRIGGER update_student_activity_logs_updated_at
  BEFORE UPDATE ON student_activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create activity log entry
CREATE OR REPLACE FUNCTION create_student_activity_log(
  p_student_id UUID,
  p_activity_type VARCHAR(50),
  p_title VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_activity_date TIMESTAMPTZ DEFAULT now(),
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_related_exam_id UUID DEFAULT NULL,
  p_related_class_id UUID DEFAULT NULL,
  p_related_todo_id UUID DEFAULT NULL,
  p_related_consultation_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from student
  SELECT tenant_id INTO v_tenant_id FROM students WHERE id = p_student_id;

  -- Insert activity log
  INSERT INTO student_activity_logs (
    tenant_id,
    student_id,
    activity_type,
    title,
    description,
    activity_date,
    metadata,
    related_exam_id,
    related_class_id,
    related_todo_id,
    related_consultation_id,
    created_by
  ) VALUES (
    v_tenant_id,
    p_student_id,
    p_activity_type,
    p_title,
    p_description,
    p_activity_date,
    p_metadata,
    p_related_exam_id,
    p_related_class_id,
    p_related_todo_id,
    p_related_consultation_id,
    auth.uid()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS: Auto-create activity logs
-- =====================================================

-- Trigger: Create log when exam score is added
CREATE OR REPLACE FUNCTION trigger_log_exam_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_student_activity_log(
    p_student_id := NEW.student_id,
    p_activity_type := 'exam_score',
    p_title := (SELECT name FROM exams WHERE id = NEW.exam_id),
    p_description := format('점수: %.1f점 (%.1f%%)', NEW.raw_score, NEW.percentage),
    p_activity_date := (SELECT exam_date FROM exams WHERE id = NEW.exam_id),
    p_metadata := jsonb_build_object(
      'raw_score', NEW.raw_score,
      'max_score', NEW.max_score,
      'percentage', NEW.percentage,
      'exam_id', NEW.exam_id
    ),
    p_related_exam_id := NEW.exam_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_exam_score_insert
  AFTER INSERT ON exam_scores
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_exam_score();

-- Trigger: Create log when student completes a TODO
CREATE OR REPLACE FUNCTION trigger_log_todo_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when completed_at is newly set
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    PERFORM create_student_activity_log(
      p_student_id := NEW.student_id,
      p_activity_type := 'homework_submit',
      p_title := NEW.title,
      p_description := '과제 완료',
      p_activity_date := NEW.completed_at,
      p_metadata := jsonb_build_object(
        'subject', NEW.subject,
        'due_date', NEW.due_date,
        'todo_id', NEW.id
      ),
      p_related_todo_id := NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_todo_complete
  AFTER UPDATE ON student_todos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_todo_complete();

-- Trigger: Create log when class enrollment happens
CREATE OR REPLACE FUNCTION trigger_log_class_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_student_activity_log(
    p_student_id := NEW.student_id,
    p_activity_type := 'class_enroll',
    p_title := (SELECT name FROM classes WHERE id = NEW.class_id),
    p_description := '수업 등록',
    p_metadata := jsonb_build_object(
      'class_id', NEW.class_id,
      'enrollment_id', NEW.id
    ),
    p_related_class_id := NEW.class_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_class_enrollment_insert
  AFTER INSERT ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_class_enrollment();

-- Trigger: Create log when consultation is recorded
CREATE OR REPLACE FUNCTION trigger_log_consultation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_student_activity_log(
    p_student_id := NEW.student_id,
    p_activity_type := 'consultation',
    p_title := format('%s 상담', NEW.consultation_type),
    p_description := LEFT(NEW.content, 200), -- 처음 200자만
    p_activity_date := NEW.consultation_date,
    p_metadata := jsonb_build_object(
      'consultation_type', NEW.consultation_type,
      'consultation_id', NEW.id
    ),
    p_related_consultation_id := NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_consultation_insert
  AFTER INSERT ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_consultation();

-- Trigger: Create log for attendance
CREATE OR REPLACE FUNCTION trigger_log_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_activity_type VARCHAR(50);
  v_class_name VARCHAR(255);
  v_session_date TIMESTAMPTZ;
BEGIN
  -- Determine activity type based on status
  v_activity_type := CASE NEW.status
    WHEN 'present' THEN 'attendance_present'
    WHEN 'late' THEN 'attendance_late'
    WHEN 'absent' THEN 'attendance_absent'
    ELSE 'attendance_present'
  END;

  -- Get class name and session date
  SELECT c.name, ats.session_date
  INTO v_class_name, v_session_date
  FROM attendance_sessions ats
  LEFT JOIN classes c ON c.id = ats.class_id
  WHERE ats.id = NEW.session_id;

  PERFORM create_student_activity_log(
    p_student_id := NEW.student_id,
    p_activity_type := v_activity_type,
    p_title := COALESCE(v_class_name, '수업'),
    p_description := CASE NEW.status
      WHEN 'present' THEN '출석'
      WHEN 'late' THEN '지각'
      WHEN 'absent' THEN '결석'
      ELSE NEW.status
    END,
    p_activity_date := COALESCE(v_session_date, NEW.created_at),
    p_metadata := jsonb_build_object(
      'status', NEW.status,
      'check_in_at', NEW.check_in_at,
      'check_out_at', NEW.check_out_at,
      'attendance_id', NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_attendance_insert
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_attendance();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE student_activity_logs IS '학생의 모든 활동을 기록하는 통합 로그 테이블';
COMMENT ON COLUMN student_activity_logs.activity_type IS '활동 유형 (ref_activity_types 참조)';
COMMENT ON COLUMN student_activity_logs.metadata IS '활동과 관련된 추가 정보 (JSON 형태)';
COMMENT ON COLUMN student_activity_logs.related_exam_id IS '관련 시험 ID (시험 활동인 경우)';
COMMENT ON COLUMN student_activity_logs.related_class_id IS '관련 수업 ID (수업 관련 활동인 경우)';
