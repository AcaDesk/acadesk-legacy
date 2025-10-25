-- ============================================================================
-- Student Activity Logs System
-- ============================================================================
-- This migration creates:
-- 1. ref_activity_types - Reference table for activity type definitions
-- 2. student_activity_logs - Activity log entries for students
--
-- Benefits:
-- - Centralized timeline of all student activities
-- - Flexible metadata storage for different activity types
-- - Easy filtering and reporting
-- ============================================================================

-- ============================================================================
-- 1. Reference Table: Activity Types
-- ============================================================================
-- Drop existing table if it exists (to ensure clean schema)
DROP TABLE IF EXISTS ref_activity_types CASCADE;

CREATE TABLE ref_activity_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Lucide icon name
  color TEXT, -- Variant: default, secondary, outline, destructive
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add common activity types
INSERT INTO ref_activity_types (code, label, description, icon, color, sort_order) VALUES
  ('enrollment', '수업 등록', '학생이 새 수업에 등록함', 'UserPlus', 'default', 10),
  ('withdrawal', '수업 탈퇴', '학생이 수업에서 탈퇴함', 'UserMinus', 'secondary', 20),
  ('attendance_present', '출석', '학생이 출석함', 'CheckCircle', 'default', 30),
  ('attendance_absent', '결석', '학생이 결석함', 'XCircle', 'destructive', 40),
  ('attendance_late', '지각', '학생이 지각함', 'Clock', 'secondary', 50),
  ('exam_score', '시험 성적', '시험 성적이 입력됨', 'Award', 'default', 60),
  ('homework_assigned', '숙제 배정', '숙제가 배정됨', 'BookOpen', 'default', 70),
  ('homework_submitted', '숙제 제출', '숙제를 제출함', 'CheckCircle', 'default', 80),
  ('homework_graded', '숙제 채점', '숙제가 채점됨', 'FileText', 'default', 90),
  ('consultation', '상담', '학부모 또는 학생 상담 진행', 'MessageCircle', 'default', 100),
  ('report_sent', '리포트 발송', '학습 리포트가 발송됨', 'Send', 'default', 110),
  ('textbook_assigned', '교재 배정', '교재가 배정됨', 'Book', 'default', 120),
  ('textbook_progress', '교재 진도', '교재 진도가 업데이트됨', 'BookOpen', 'secondary', 130),
  ('invoice_issued', '청구서 발행', '청구서가 발행됨', 'Receipt', 'default', 140),
  ('payment_received', '결제 완료', '결제가 완료됨', 'CreditCard', 'default', 150),
  ('note_added', '메모 추가', '강사 메모가 추가됨', 'StickyNote', 'secondary', 160),
  ('profile_updated', '정보 수정', '학생 정보가 수정됨', 'Edit', 'secondary', 170),
  ('alert', '알림', '중요 알림 또는 경고', 'AlertCircle', 'destructive', 180),
  ('other', '기타', '기타 활동', 'Info', 'outline', 999);

-- ============================================================================
-- 2. Main Table: Student Activity Logs
-- ============================================================================
-- Drop existing table if it exists (to ensure clean schema)
DROP TABLE IF EXISTS student_activity_logs CASCADE;

CREATE TABLE student_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL REFERENCES ref_activity_types(code),
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_activity_logs_student ON student_activity_logs(student_id, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_logs_tenant ON student_activity_logs(tenant_id, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_logs_type ON student_activity_logs(activity_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_logs_date ON student_activity_logs(activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_activity_logs_metadata ON student_activity_logs USING gin(metadata) WHERE deleted_at IS NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE ref_activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity Types: Read-only for all authenticated users
CREATE POLICY "Activity types are viewable by all authenticated users"
  ON ref_activity_types FOR SELECT
  TO authenticated
  USING (active = true);

-- Activity Logs: Allow service_role full access (application uses service_role client)
CREATE POLICY "Service role has full access to activity logs"
  ON student_activity_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Triggers
-- ============================================================================
-- Auto-update updated_at timestamp
-- Note: Requires update_updated_at_column() function to exist
-- Uncomment below if the function is available:
-- CREATE TRIGGER update_activity_logs_updated_at
--   BEFORE UPDATE ON student_activity_logs
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Function: Log Student Activity
-- ============================================================================
-- This function makes it easy to log activities from other triggers/functions
CREATE OR REPLACE FUNCTION log_student_activity(
  p_tenant_id UUID,
  p_student_id UUID,
  p_activity_type TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_activity_date TIMESTAMPTZ DEFAULT NOW(),
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO student_activity_logs (
    tenant_id,
    student_id,
    activity_type,
    title,
    description,
    metadata,
    activity_date,
    created_by
  ) VALUES (
    p_tenant_id,
    p_student_id,
    p_activity_type,
    p_title,
    p_description,
    p_metadata,
    p_activity_date,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_student_activity TO authenticated;

-- ============================================================================
-- Auto-logging Triggers (Disabled for now)
-- ============================================================================
-- Triggers for automatic activity logging have been removed.
-- Use the log_student_activity() helper function manually in application code
-- or Server Actions when needed.

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE ref_activity_types IS 'Reference table for student activity type definitions';
COMMENT ON TABLE student_activity_logs IS 'Timeline of all student activities (attendance, grades, homework, etc.)';
COMMENT ON FUNCTION log_student_activity IS 'Helper function to easily log student activities from triggers or application code';
