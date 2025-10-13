-- Calendar Events System
-- 학원의 모든 일정을 통합 관리하는 캘린더 시스템

-- 캘린더 이벤트 메인 테이블
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- 이벤트 기본 정보
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'class', 'exam', 'consultation', 'payment_due', 'task_due', 'birthday', 'holiday', 'event', 'other'

  -- 시간 정보
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,

  -- 색상 및 스타일
  color TEXT, -- hex color code (e.g., '#3b82f6')

  -- 연관 엔티티 (선택적)
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  consultation_id UUID, -- TODO: 상담 테이블 생성 후 FK 추가

  -- 반복 일정 정보
  recurrence_rule TEXT, -- RRULE format (RFC 5545)
  recurrence_exception TEXT[], -- 제외할 날짜들
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE, -- 반복 일정의 부모

  -- 알림 설정
  reminder_minutes INTEGER, -- 몇 분 전에 알림을 보낼지

  -- 메타데이터
  meta JSONB DEFAULT '{}'::jsonb,

  -- 감사 필드
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- 제약 조건
  CONSTRAINT valid_time_range CHECK (end_at > start_at),
  CONSTRAINT valid_event_type CHECK (event_type IN ('class', 'exam', 'consultation', 'payment_due', 'task_due', 'birthday', 'holiday', 'event', 'other'))
);

-- 인덱스
CREATE INDEX idx_calendar_events_tenant ON calendar_events(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_time_range ON calendar_events(tenant_id, start_at, end_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_type ON calendar_events(tenant_id, event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_class ON calendar_events(class_id) WHERE deleted_at IS NULL AND class_id IS NOT NULL;
CREATE INDEX idx_calendar_events_student ON calendar_events(student_id) WHERE deleted_at IS NULL AND student_id IS NOT NULL;
CREATE INDEX idx_calendar_events_exam ON calendar_events(exam_id) WHERE deleted_at IS NULL AND exam_id IS NOT NULL;
CREATE INDEX idx_calendar_events_parent ON calendar_events(parent_event_id) WHERE deleted_at IS NULL AND parent_event_id IS NOT NULL;

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 활성화
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 테넌트의 데이터만 접근 가능
CREATE POLICY calendar_events_tenant_isolation ON calendar_events
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

-- RLS 정책: 본인이 생성한 이벤트 수정/삭제
CREATE POLICY calendar_events_owner_update ON calendar_events
  FOR UPDATE
  USING (created_by = auth.uid() OR get_current_user_role() IN ('owner', 'instructor'));

CREATE POLICY calendar_events_owner_delete ON calendar_events
  FOR DELETE
  USING (created_by = auth.uid() OR get_current_user_role() IN ('owner', 'instructor'));

-- RLS 정책: owner, instructor는 모든 이벤트 생성 가능
CREATE POLICY calendar_events_create ON calendar_events
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()) AND get_current_user_role() IN ('owner', 'instructor', 'assistant'));

-- 이벤트 색상 매핑을 위한 뷰
CREATE OR REPLACE VIEW calendar_event_colors AS
SELECT
  'class' AS event_type,
  '#3b82f6' AS default_color, -- blue
  '수업' AS label
UNION ALL SELECT 'exam', '#8b5cf6', '시험' -- purple
UNION ALL SELECT 'consultation', '#10b981', '상담' -- green
UNION ALL SELECT 'payment_due', '#ef4444', '납부 마감' -- red
UNION ALL SELECT 'task_due', '#f59e0b', '과제 마감' -- amber
UNION ALL SELECT 'birthday', '#ec4899', '생일' -- pink
UNION ALL SELECT 'holiday', '#6b7280', '휴일' -- gray
UNION ALL SELECT 'event', '#06b6d4', '학원 이벤트' -- cyan
UNION ALL SELECT 'other', '#64748b', '기타'; -- slate

COMMENT ON TABLE calendar_events IS '학원의 모든 일정을 통합 관리하는 캘린더 이벤트 테이블';
COMMENT ON COLUMN calendar_events.event_type IS '이벤트 타입: class(수업), exam(시험), consultation(상담), payment_due(납부 마감), task_due(과제 마감), birthday(생일), holiday(휴일), event(학원 이벤트), other(기타)';
COMMENT ON COLUMN calendar_events.recurrence_rule IS 'RFC 5545 RRULE 형식의 반복 규칙 (예: FREQ=WEEKLY;BYDAY=MO,WE,FR)';
COMMENT ON COLUMN calendar_events.color IS '이벤트 색상 (hex code). NULL이면 event_type별 기본 색상 사용';
