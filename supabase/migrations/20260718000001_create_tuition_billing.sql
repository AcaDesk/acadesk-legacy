-- 수납/청구 도메인 테이블 및 원자화 RPC (Phase 2.1)
--
-- src/core/types/payment.ts의 기존 타입 정의에 맞춘 스키마.
-- 프로젝트 컨벤션: 금액 BIGINT(원), status text+CHECK, 소프트삭제,
-- RLS 정책 없이 활성화(service_role 전용), 쓰기 원자화는 RPC.

-- ============================================================
-- 1. 청구서
-- ============================================================

CREATE TABLE IF NOT EXISTS tuition_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  billing_month text NOT NULL CHECK (billing_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  total_amount bigint NOT NULL CHECK (total_amount >= 0),
  paid_amount bigint NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status text NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'paid', 'overdue', 'partially_paid')),
  -- 미납 알림 발송 시각 (데일리 크론 중복 발송 방지)
  overdue_notified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

COMMENT ON TABLE tuition_invoices IS '학생별 월 수강료 청구서 (학원→학생 청구, SaaS 과금 아님)';

-- 학생·월별 중복 청구 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_tuition_invoices_student_month
  ON tuition_invoices (tenant_id, student_id, billing_month)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tuition_invoices_tenant_month
  ON tuition_invoices (tenant_id, billing_month) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_tenant_status
  ON tuition_invoices (tenant_id, status) WHERE deleted_at IS NULL;
-- 미납/연체 스캔 경로 (데일리 크론)
CREATE INDEX IF NOT EXISTS idx_tuition_invoices_due_unpaid
  ON tuition_invoices (tenant_id, due_date)
  WHERE deleted_at IS NULL AND status <> 'paid';

-- ============================================================
-- 2. 청구 항목
-- ============================================================

CREATE TABLE IF NOT EXISTS tuition_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  -- discount 항목은 음수 금액
  amount bigint NOT NULL,
  item_type text NOT NULL DEFAULT 'tuition'
    CHECK (item_type IN ('tuition', 'material', 'extra', 'discount')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tuition_invoice_items_invoice
  ON tuition_invoice_items (invoice_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 3. 수납(결제) 기록
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  paid_amount bigint NOT NULL CHECK (paid_amount > 0),
  payment_method text NOT NULL
    CHECK (payment_method IN ('card', 'transfer', 'cash')),
  reference_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice
  ON payments (invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date
  ON payments (tenant_id, payment_date DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. RLS + updated_at 트리거
-- ============================================================

ALTER TABLE tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_tuition_invoices_updated_at ON tuition_invoices;
CREATE TRIGGER trg_tuition_invoices_updated_at
  BEFORE UPDATE ON tuition_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tuition_invoice_items_updated_at ON tuition_invoice_items;
CREATE TRIGGER trg_tuition_invoice_items_updated_at
  BEFORE UPDATE ON tuition_invoice_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. RPC: 청구서 + 항목 원자 생성
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_tuition_invoice(
  p_tenant_id uuid,
  p_student_id uuid,
  p_billing_month text,
  p_due_date date,
  p_items jsonb,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_total bigint;
BEGIN
  -- 학생 소유 검증 (백스톱)
  PERFORM 1 FROM students
    WHERE id = p_student_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION '학생을 찾을 수 없습니다';
  END IF;

  SELECT COALESCE(SUM((item->>'amount')::bigint), 0)
    INTO v_total
    FROM jsonb_array_elements(p_items) AS item;

  IF v_total < 0 THEN
    RAISE EXCEPTION '청구 총액은 0원 이상이어야 합니다';
  END IF;

  INSERT INTO tuition_invoices (
    tenant_id, student_id, billing_month, issue_date, due_date,
    total_amount, status, notes
  ) VALUES (
    p_tenant_id, p_student_id, p_billing_month, p_issue_date, p_due_date,
    v_total, 'unpaid', NULLIF(p_notes, '')
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO tuition_invoice_items (tenant_id, invoice_id, description, amount, item_type)
  SELECT
    p_tenant_id,
    v_invoice_id,
    item->>'description',
    (item->>'amount')::bigint,
    COALESCE(NULLIF(item->>'item_type', ''), 'tuition')
  FROM jsonb_array_elements(p_items) AS item;

  RETURN jsonb_build_object('invoice_id', v_invoice_id, 'total_amount', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_tuition_invoice(uuid, uuid, text, date, jsonb, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tuition_invoice(uuid, uuid, text, date, jsonb, date, text) TO service_role;

-- ============================================================
-- 6. RPC: 수납 기록 + 청구서 상태 원자 갱신
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_tuition_payment(
  p_tenant_id uuid,
  p_invoice_id uuid,
  p_paid_amount bigint,
  p_payment_method text,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_invoice tuition_invoices%ROWTYPE;
  v_payment_id uuid;
  v_new_paid bigint;
  v_new_status text;
BEGIN
  SELECT * INTO v_invoice
    FROM tuition_invoices
   WHERE id = p_invoice_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '청구서를 찾을 수 없습니다';
  END IF;

  IF p_paid_amount <= 0 THEN
    RAISE EXCEPTION '수납 금액은 0원보다 커야 합니다';
  END IF;

  INSERT INTO payments (
    tenant_id, invoice_id, payment_date, paid_amount,
    payment_method, reference_number, notes
  ) VALUES (
    p_tenant_id, p_invoice_id, p_payment_date, p_paid_amount,
    p_payment_method, NULLIF(p_reference_number, ''), NULLIF(p_notes, '')
  ) RETURNING id INTO v_payment_id;

  -- 수납 합계로 청구서 상태 재계산 (수납 취소/부분 수납에도 일관)
  SELECT COALESCE(SUM(paid_amount), 0)
    INTO v_new_paid
    FROM payments
   WHERE invoice_id = p_invoice_id AND deleted_at IS NULL;

  v_new_status := CASE
    WHEN v_new_paid >= v_invoice.total_amount THEN 'paid'
    WHEN v_new_paid > 0 THEN 'partially_paid'
    WHEN v_invoice.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END;

  UPDATE tuition_invoices
     SET paid_amount = v_new_paid,
         status = v_new_status
   WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'invoice_id', p_invoice_id,
    'paid_amount', v_new_paid,
    'total_amount', v_invoice.total_amount,
    'status', v_new_status,
    'student_id', v_invoice.student_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_tuition_payment(uuid, uuid, bigint, text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_tuition_payment(uuid, uuid, bigint, text, date, text, text) TO service_role;
