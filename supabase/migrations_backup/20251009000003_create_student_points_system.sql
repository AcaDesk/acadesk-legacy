-- Create student points/rewards system for behavior and achievement tracking
-- Supports positive (rewards) and negative (penalties) point tracking

-- 1. Create reference table for point types
CREATE TABLE IF NOT EXISTS ref_point_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('reward', 'penalty')),
  default_points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert common point types
INSERT INTO ref_point_types (code, label, category, default_points, description, sort_order)
VALUES
  -- Rewards (positive points)
  ('attendance_perfect', '개근상', 'reward', 10, '한 달 개근', 1),
  ('homework_complete', '과제 완료', 'reward', 5, '과제를 성실히 완료', 2),
  ('exam_excellent', '우수 성적', 'reward', 15, '시험에서 우수한 성적 달성', 3),
  ('exam_improved', '성적 향상', 'reward', 10, '이전 대비 성적 향상', 4),
  ('attitude_good', '모범적 태도', 'reward', 5, '수업 태도가 모범적', 5),
  ('help_classmate', '친구 도움', 'reward', 3, '다른 학생을 도움', 6),
  ('early_arrival', '조기 도착', 'reward', 2, '수업에 일찍 도착', 7),

  -- Penalties (negative points)
  ('late_arrival', '지각', 'penalty', -5, '수업에 지각', 101),
  ('absence_unexcused', '무단 결석', 'penalty', -10, '사유 없는 결석', 102),
  ('homework_missing', '과제 미제출', 'penalty', -5, '과제를 제출하지 않음', 103),
  ('disturbance', '수업 방해', 'penalty', -10, '수업 중 방해 행위', 104),
  ('attitude_poor', '불량 태도', 'penalty', -8, '수업 태도 불량', 105),
  ('phone_use', '휴대폰 사용', 'penalty', -5, '수업 중 휴대폰 사용', 106)
ON CONFLICT (code) DO NOTHING;

-- 3. Create student_points table
CREATE TABLE IF NOT EXISTS student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  point_type TEXT NOT NULL REFERENCES ref_point_types(code),
  points INTEGER NOT NULL,
  reason TEXT,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_by UUID REFERENCES users(id),
  related_class_id UUID REFERENCES classes(id),
  related_exam_id UUID REFERENCES exams(id),
  related_attendance_id UUID REFERENCES attendance(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Create indexes
CREATE INDEX idx_student_points_student_id ON student_points(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_points_tenant_id ON student_points(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_points_awarded_date ON student_points(awarded_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_points_point_type ON student_points(point_type) WHERE deleted_at IS NULL;

-- 5. Enable RLS
ALTER TABLE student_points ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users can view points in their tenant"
  ON student_points FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff can manage student points"
  ON student_points FOR ALL
  USING (
    tenant_id = get_current_tenant_id() AND
    get_current_user_role() IN ('owner', 'instructor', 'assistant')
  );

-- 7. Function to get student's current point balance
CREATE OR REPLACE FUNCTION get_student_point_balance(p_student_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM student_points
  WHERE student_id = p_student_id
    AND deleted_at IS NULL
    AND tenant_id = get_current_tenant_id();
$$ LANGUAGE SQL STABLE;

-- 8. Function to get student's point history with details
CREATE OR REPLACE FUNCTION get_student_point_history(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  point_type TEXT,
  point_label TEXT,
  points INTEGER,
  reason TEXT,
  awarded_date DATE,
  awarded_by_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    sp.id,
    sp.point_type,
    rpt.label AS point_label,
    sp.points,
    sp.reason,
    sp.awarded_date,
    u.name AS awarded_by_name,
    sp.created_at
  FROM student_points sp
  LEFT JOIN ref_point_types rpt ON sp.point_type = rpt.code
  LEFT JOIN users u ON sp.awarded_by = u.id
  WHERE sp.student_id = p_student_id
    AND sp.deleted_at IS NULL
    AND sp.tenant_id = get_current_tenant_id()
  ORDER BY sp.awarded_date DESC, sp.created_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

-- 9. Trigger to log point awards to activity log
CREATE OR REPLACE FUNCTION log_student_point_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_point_label TEXT;
  v_category TEXT;
BEGIN
  -- Get point type info
  SELECT label, category INTO v_point_label, v_category
  FROM ref_point_types
  WHERE code = NEW.point_type;

  -- Create activity log entry
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
    CASE
      WHEN v_category = 'reward' THEN 'point_reward'
      ELSE 'point_penalty'
    END,
    NEW.awarded_date,
    CASE
      WHEN v_category = 'reward' THEN '상점 획득: ' || v_point_label
      ELSE '벌점 부여: ' || v_point_label
    END,
    NEW.reason,
    jsonb_build_object(
      'points', NEW.points,
      'point_type', NEW.point_type,
      'balance', get_student_point_balance(NEW.student_id)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_student_point_activity
  AFTER INSERT ON student_points
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION log_student_point_activity();

-- 10. View for student point summary
CREATE OR REPLACE VIEW v_student_point_summary AS
SELECT
  s.id AS student_id,
  s.tenant_id,
  u.name AS student_name,
  s.student_code,
  COALESCE(SUM(sp.points) FILTER (WHERE sp.points > 0), 0) AS total_rewards,
  COALESCE(SUM(sp.points) FILTER (WHERE sp.points < 0), 0) AS total_penalties,
  COALESCE(SUM(sp.points), 0) AS current_balance,
  COUNT(sp.id) FILTER (WHERE sp.points > 0) AS reward_count,
  COUNT(sp.id) FILTER (WHERE sp.points < 0) AS penalty_count
FROM students s
JOIN users u ON s.user_id = u.id AND u.deleted_at IS NULL
LEFT JOIN student_points sp ON s.id = sp.student_id AND sp.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.tenant_id, u.name, s.student_code;

-- 11. Add comments
COMMENT ON TABLE ref_point_types IS 'Reference table for student reward and penalty types';
COMMENT ON TABLE student_points IS 'Tracks individual point awards and penalties for students';
COMMENT ON COLUMN student_points.points IS 'Point value (positive for rewards, negative for penalties)';
COMMENT ON FUNCTION get_student_point_balance IS 'Returns the current point balance for a student';
COMMENT ON FUNCTION get_student_point_history IS 'Returns detailed point history for a student';
