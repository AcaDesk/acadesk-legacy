-- 포인트 시스템 복구 (스키마 드리프트 해소)
--
-- 배경: 20251009000003이 만든 ref_point_types/student_points가 2026-05 원격 정리
-- 작업에서 삭제되었다 (당시 ref_activity_types에 point_reward/point_penalty 코드가
-- 없어 트리거 INSERT가 항상 FK 위반 → 데이터 0건 → 미사용으로 분류된 것으로 추정).
-- 그러나 코드(student-points.ts, StudentPointsWidget, 키오스크 게이미피케이션)는
-- 여전히 이 테이블들을 사용하므로 복구한다. FK 원인은 20260710000001이 해소.
--
-- 원본과의 차이:
-- - RLS는 정책 없이 활성화만 (service_role 전용 접근 — 프로젝트 표준 패턴)
-- - 미사용 헬퍼(get_student_point_balance/history, v_student_point_summary) 미복구
-- - 트리거의 balance 계산을 인라인 서브쿼리로 대체 (원본은 현재 존재하지 않는
--   get_current_tenant_id()에 의존하는 함수를 사용했음)

-- 1. 포인트 유형 참조 테이블
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

INSERT INTO ref_point_types (code, label, category, default_points, description, sort_order)
VALUES
  ('attendance_perfect', '개근상', 'reward', 10, '한 달 개근', 1),
  ('homework_complete', '과제 완료', 'reward', 5, '과제를 성실히 완료', 2),
  ('exam_excellent', '우수 성적', 'reward', 15, '시험에서 우수한 성적 달성', 3),
  ('exam_improved', '성적 향상', 'reward', 10, '이전 대비 성적 향상', 4),
  ('attitude_good', '모범적 태도', 'reward', 5, '수업 태도가 모범적', 5),
  ('help_classmate', '친구 도움', 'reward', 3, '다른 학생을 도움', 6),
  ('early_arrival', '조기 도착', 'reward', 2, '수업에 일찍 도착', 7),
  ('late_arrival', '지각', 'penalty', -5, '수업에 지각', 101),
  ('absence_unexcused', '무단 결석', 'penalty', -10, '사유 없는 결석', 102),
  ('homework_missing', '과제 미제출', 'penalty', -5, '과제를 제출하지 않음', 103),
  ('disturbance', '수업 방해', 'penalty', -10, '수업 중 방해 행위', 104),
  ('attitude_poor', '불량 태도', 'penalty', -8, '수업 태도 불량', 105),
  ('phone_use', '휴대폰 사용', 'penalty', -5, '수업 중 휴대폰 사용', 106)
ON CONFLICT (code) DO NOTHING;

-- 2. 포인트 지급/차감 기록
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

CREATE INDEX IF NOT EXISTS idx_student_points_tenant_student
  ON student_points (tenant_id, student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_points_tenant_awarded_date
  ON student_points (tenant_id, awarded_date DESC) WHERE deleted_at IS NULL;

-- 3. RLS: 정책 없이 활성화만 (service_role 전용)
ALTER TABLE ref_point_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_points ENABLE ROW LEVEL SECURITY;

-- 4. 포인트 기록 → 학생 활동 타임라인 로그 트리거
CREATE OR REPLACE FUNCTION log_student_point_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_point_label TEXT;
  v_category TEXT;
BEGIN
  SELECT label, category INTO v_point_label, v_category
  FROM ref_point_types
  WHERE code = NEW.point_type;

  INSERT INTO student_activity_logs (
    tenant_id, student_id, activity_type, activity_date, title, description, metadata
  ) VALUES (
    NEW.tenant_id,
    NEW.student_id,
    CASE WHEN v_category = 'reward' THEN 'point_reward' ELSE 'point_penalty' END,
    NEW.awarded_date,
    CASE WHEN v_category = 'reward' THEN '상점 획득: ' || v_point_label
         ELSE '벌점 부여: ' || v_point_label END,
    NEW.reason,
    jsonb_build_object(
      'points', NEW.points,
      'point_type', NEW.point_type,
      'balance', (
        SELECT COALESCE(SUM(points), 0)
        FROM student_points
        WHERE student_id = NEW.student_id
          AND tenant_id = NEW.tenant_id
          AND deleted_at IS NULL
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION log_student_point_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_student_point_activity() TO service_role;

DROP TRIGGER IF EXISTS trg_log_student_point_activity ON student_points;
CREATE TRIGGER trg_log_student_point_activity
  AFTER INSERT ON student_points
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION log_student_point_activity();

COMMENT ON TABLE ref_point_types IS '학생 상점/벌점 유형 참조 테이블';
COMMENT ON TABLE student_points IS '학생별 상점/벌점 지급 기록 (양수=상점, 음수=벌점)';
