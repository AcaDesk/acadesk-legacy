-- 운영 성숙도: 관리자 감사 로그 + 피처 플래그 런타임 오버라이드 (Phase 3)

-- ============================================================
-- 1. 관리자 감사 로그
--    student_activity_logs(학생 도메인 이벤트)와 달리, 권한 변경·삭제·
--    구성 변경 등 "누가 무엇을 바꿨나"를 추적하는 보안/컴플라이언스 로그.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 플랫폼 레벨 액션(테넌트 승인 등)은 NULL 가능
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  actor_user_id uuid,
  actor_email text,
  -- 예: 'student.delete', 'subscription.set_plan', 'user.approve'
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin_audit_logs IS '관리자 액션 감사 로그 (append-only, 권한/삭제/구성 변경 추적)';

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_tenant_time
  ON admin_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON admin_audit_logs (action, created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. 피처 플래그 오버라이드
--    코드의 FEATURES 상수가 기본값이고, 이 테이블이 런타임 오버라이드다.
--    tenant_id NULL = 전역 오버라이드(킬스위치), 값 있으면 테넌트별.
--    우선순위: 테넌트별 > 전역 > 코드 기본값.
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  status text NOT NULL
    CHECK (status IN ('active', 'inactive', 'maintenance', 'beta', 'deprecated')),
  -- 운영 메모 (오버라이드 사유)
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE feature_flag_overrides IS '피처 플래그 런타임 오버라이드 (tenant_id NULL=전역 킬스위치)';

-- 같은 (feature, tenant) 조합은 1행 — NULL 테넌트(전역)도 유일해야 함
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flag_overrides
  ON feature_flag_overrides (feature_key, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_feature_flag_overrides_updated_at ON feature_flag_overrides;
CREATE TRIGGER trg_feature_flag_overrides_updated_at
  BEFORE UPDATE ON feature_flag_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
