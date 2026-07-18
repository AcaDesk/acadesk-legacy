-- SaaS 플랜/구독 기반 (Phase 3 — 수익화 인프라)
--
-- internal/product/PricingStrategy.md의 학생 수 기반 티어를 스키마화한다.
-- PG(결제사) 연동 전 단계: 플랜 정의 + 테넌트 구독 + 학생 수 게이팅의 기반.
-- 플랜 부여는 당분간 플랫폼 관리자가 수동 관리한다 (/admin/subscriptions).

-- ============================================================
-- 1. 플랜 참조 테이블 (글로벌 — ref 테이블 원칙)
-- ============================================================

CREATE TABLE IF NOT EXISTS ref_saas_plans (
  code text PRIMARY KEY,
  label text NOT NULL,
  -- NULL = 무제한
  max_students integer CHECK (max_students IS NULL OR max_students > 0),
  monthly_price bigint NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ref_saas_plans (code, label, max_students, monthly_price, sort_order) VALUES
  ('trial',     '무료 체험',   30,   0,     1),
  ('starter',   'Starter',    30,   29000, 2),
  ('standard',  'Standard',   100,  59000, 3),
  ('growth',    'Growth',     300,  99000, 4),
  ('unlimited', '무제한(내부)', NULL, 0,     99)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE ref_saas_plans IS 'SaaS 요금 플랜 정의 (학원→Acadesk 과금, 학생 수 기반 티어)';

-- ============================================================
-- 2. 테넌트 구독
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'trial' REFERENCES ref_saas_plans(code),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled')),
  current_period_start date,
  -- NULL = 무기한 (수동 관리 단계)
  current_period_end date,
  -- 운영 메모 (계약 조건, 결제 방식 등)
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_subscriptions IS '테넌트별 SaaS 구독 상태 (PG 연동 전 수동 관리)';

ALTER TABLE ref_saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_tenant_subscriptions_updated_at ON tenant_subscriptions;
CREATE TRIGGER trg_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3. 기존 테넌트 백필 — 무제한 플랜
--    (게이팅 도입으로 기존 운영 학원이 갑자기 차단되지 않도록)
-- ============================================================

INSERT INTO tenant_subscriptions (tenant_id, plan_code, notes)
SELECT id, 'unlimited', '게이팅 도입 이전 기존 테넌트 자동 백필 (2026-07-18)'
FROM tenants
WHERE deleted_at IS NULL
ON CONFLICT (tenant_id) DO NOTHING;
