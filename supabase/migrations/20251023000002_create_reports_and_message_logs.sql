-- ============================================================================
-- 리포트 및 메시지 로그 테이블 생성
-- Created: 2025-10-23
-- Description: 성적 리포트 및 메시지 전송 이력 관리
-- ============================================================================

-- ============================================================================
-- 1. reports 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('student_monthly', 'student_exam', 'class_summary')),

  -- 대상
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,

  -- 리포트 데이터 (JSON)
  data jsonb NOT NULL,

  -- 메타데이터
  generated_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  -- 제약 조건
  CONSTRAINT report_target_check CHECK (
    (type = 'student_monthly' AND student_id IS NOT NULL) OR
    (type = 'student_exam' AND student_id IS NOT NULL) OR
    (type = 'class_summary' AND class_id IS NOT NULL)
  )
);

-- 인덱스
CREATE INDEX idx_reports_tenant_id ON reports(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_student_id ON reports(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_class_id ON reports(class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- 코멘트
COMMENT ON TABLE reports IS '학생/클래스 리포트 (성적, 출석, TODO 등 종합 리포트)';
COMMENT ON COLUMN reports.type IS '리포트 타입: student_monthly(월간), student_exam(시험), class_summary(클래스 요약)';
COMMENT ON COLUMN reports.data IS '리포트 데이터 (JSON): 성적, 출석, TODO, 상담 등';

-- ============================================================================
-- 2. message_logs 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- 채널 및 Provider
  channel text NOT NULL CHECK (channel IN ('sms', 'lms', 'kakao', 'email', 'push')),
  provider text NOT NULL,

  -- 수신자
  recipient_name text NOT NULL,
  recipient_contact text NOT NULL, -- phone or email

  -- 메시지 내용
  message_subject text,
  message_body text NOT NULL,

  -- 외부 서비스 ID
  message_id text, -- 알리고, 카카오 등에서 반환한 메시지 ID

  -- 상태
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),

  -- 비용
  cost numeric(10,2),

  -- 에러
  error_message text,

  -- 메타데이터
  metadata jsonb, -- { studentId, reportId, senderId, ... }

  -- 타임스탬프
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_message_logs_tenant_id ON message_logs(tenant_id);
CREATE INDEX idx_message_logs_status ON message_logs(status);
CREATE INDEX idx_message_logs_channel ON message_logs(channel);
CREATE INDEX idx_message_logs_created_at ON message_logs(created_at DESC);
CREATE INDEX idx_message_logs_recipient_contact ON message_logs(recipient_contact);
CREATE INDEX idx_message_logs_metadata_student_id ON message_logs((metadata->>'studentId')) WHERE metadata->>'studentId' IS NOT NULL;

-- 코멘트
COMMENT ON TABLE message_logs IS '메시지 전송 이력 (SMS, LMS, 카카오톡, 이메일 등)';
COMMENT ON COLUMN message_logs.channel IS '전송 채널: sms, lms, kakao, email, push';
COMMENT ON COLUMN message_logs.provider IS 'Provider 이름: Aligo, KakaoTalk, Resend 등';
COMMENT ON COLUMN message_logs.status IS '상태: pending(대기), sent(발송), delivered(전달), failed(실패)';
COMMENT ON COLUMN message_logs.metadata IS '메타데이터 (JSON): studentId, reportId, senderId 등';

-- ============================================================================
-- 3. RLS 정책 (READ 전용)
-- ============================================================================

-- 참고: INSERT/UPDATE/DELETE는 Server Actions에서 service_role로 처리
-- RLS는 클라이언트에서 직접 SELECT 시에만 적용 (tenant_id 격리)

-- RLS 활성화
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- reports 읽기 정책 (tenant_id 기반 격리)
CREATE POLICY "Reports are viewable by tenant members"
ON reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.tenant_id = reports.tenant_id
  )
);

-- message_logs 읽기 정책 (tenant_id 기반 격리)
CREATE POLICY "Message logs are viewable by tenant members"
ON message_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.tenant_id = message_logs.tenant_id
  )
);

-- 쓰기 작업은 Server Actions + service_role로 처리하므로 RLS 정책 불필요

-- ============================================================================
-- 4. Triggers (updated_at 자동 갱신)
-- ============================================================================

-- reports updated_at 트리거
CREATE TRIGGER set_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- message_logs updated_at 트리거
CREATE TRIGGER set_message_logs_updated_at
  BEFORE UPDATE ON message_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. 샘플 데이터 (개발 환경용)
-- ============================================================================

-- 개발 환경에서만 샘플 데이터 삽입
-- DO $$
-- BEGIN
--   IF current_database() LIKE '%local%' OR current_database() LIKE '%dev%' THEN
--     -- 샘플 리포트
--     INSERT INTO reports (tenant_id, type, student_id, data, generated_by)
--     SELECT
--       t.id,
--       'student_monthly',
--       s.id,
--       jsonb_build_object(
--         'studentName', u.name,
--         'avgScore', 85,
--         'attendanceRate', 95,
--         'homeworkRate', 90
--       ),
--       t.owner_id
--     FROM tenants t
--     JOIN students s ON s.tenant_id = t.id
--     JOIN users u ON u.id = s.user_id
--     LIMIT 1;
--   END IF;
-- END $$;
