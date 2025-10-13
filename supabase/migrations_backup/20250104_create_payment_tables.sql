-- =====================================================
-- 학원비 관리 테이블 생성
-- =====================================================

-- invoices: 청구서
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL, -- Format: 'YYYY-MM'
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, paid, overdue, partially_paid
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('unpaid', 'paid', 'overdue', 'partially_paid')),
  CONSTRAINT valid_amounts CHECK (paid_amount >= 0 AND paid_amount <= total_amount),
  CONSTRAINT valid_billing_month CHECK (billing_month ~ '^\d{4}-(0[1-9]|1[0-2])$')
);

-- invoice_items: 청구 항목
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'tuition', -- tuition, material, extra

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_item_type CHECK (item_type IN ('tuition', 'material', 'extra', 'discount')),
  CONSTRAINT valid_amount CHECK (amount != 0)
);

-- payments: 수납 기록
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  paid_amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'card', -- card, transfer, cash
  reference_number TEXT, -- 거래 참조 번호
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('card', 'transfer', 'cash')),
  CONSTRAINT valid_paid_amount CHECK (paid_amount > 0)
);

-- =====================================================
-- 인덱스 생성
-- =====================================================

CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX idx_invoices_billing_month ON public.invoices(billing_month);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_deleted_at ON public.invoices(deleted_at);

CREATE INDEX idx_invoice_items_tenant_id ON public.invoice_items(tenant_id);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_deleted_at ON public.invoice_items(deleted_at);

CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_deleted_at ON public.payments(deleted_at);

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- invoices RLS
CREATE POLICY "Users can view invoices in their tenant"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoices in their tenant"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoices in their tenant"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- invoice_items RLS
CREATE POLICY "Users can view invoice items in their tenant"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create invoice items in their tenant"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update invoice items in their tenant"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- payments RLS
CREATE POLICY "Users can view payments in their tenant"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create payments in their tenant"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update payments in their tenant"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 트리거: updated_at 자동 갱신
-- =====================================================

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 함수: 청구서 상태 자동 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total paid amount for the invoice
  UPDATE public.invoices
  SET
    paid_amount = (
      SELECT COALESCE(SUM(paid_amount), 0)
      FROM public.payments
      WHERE invoice_id = NEW.invoice_id
        AND deleted_at IS NULL
    ),
    status = CASE
      WHEN (
        SELECT COALESCE(SUM(paid_amount), 0)
        FROM public.payments
        WHERE invoice_id = NEW.invoice_id
          AND deleted_at IS NULL
      ) >= total_amount THEN 'paid'
      WHEN (
        SELECT COALESCE(SUM(paid_amount), 0)
        FROM public.payments
        WHERE invoice_id = NEW.invoice_id
          AND deleted_at IS NULL
      ) > 0 THEN 'partially_paid'
      WHEN due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'unpaid'
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 수납 기록 추가/수정 시 청구서 상태 자동 업데이트
CREATE TRIGGER payment_update_invoice_status
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- =====================================================
-- 함수: 청구서 총액 자동 계산
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total amount from invoice items
  UPDATE public.invoices
  SET
    total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.invoice_items
      WHERE invoice_id = NEW.invoice_id
        AND deleted_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 청구 항목 추가/수정 시 청구서 총액 자동 계산
CREATE TRIGGER invoice_item_calculate_total
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_total();

-- =====================================================
-- 뷰: 청구서 상세 정보 (조인된 데이터)
-- =====================================================

CREATE OR REPLACE VIEW invoice_details AS
SELECT
  i.id,
  i.tenant_id,
  i.student_id,
  s.student_code,
  u.name AS student_name,
  i.billing_month,
  i.issue_date,
  i.due_date,
  i.total_amount,
  i.paid_amount,
  i.status,
  i.notes,
  i.created_at,
  i.updated_at,
  (i.total_amount - i.paid_amount) AS remaining_amount,
  CASE
    WHEN i.status = 'overdue' THEN (CURRENT_DATE - i.due_date)
    ELSE 0
  END AS days_overdue,
  -- Aggregate invoice items
  (
    SELECT json_agg(json_build_object(
      'id', ii.id,
      'description', ii.description,
      'amount', ii.amount,
      'item_type', ii.item_type
    ))
    FROM public.invoice_items ii
    WHERE ii.invoice_id = i.id AND ii.deleted_at IS NULL
  ) AS items,
  -- Aggregate payments
  (
    SELECT json_agg(json_build_object(
      'id', p.id,
      'payment_date', p.payment_date,
      'paid_amount', p.paid_amount,
      'payment_method', p.payment_method,
      'reference_number', p.reference_number
    ))
    FROM public.payments p
    WHERE p.invoice_id = i.id AND p.deleted_at IS NULL
  ) AS payments
FROM public.invoices i
LEFT JOIN public.students s ON i.student_id = s.id
LEFT JOIN public.users u ON s.user_id = u.id
WHERE i.deleted_at IS NULL;

-- =====================================================
-- 코멘트
-- =====================================================

COMMENT ON TABLE public.invoices IS '학원비 청구서 테이블';
COMMENT ON TABLE public.invoice_items IS '청구서 세부 항목 테이블';
COMMENT ON TABLE public.payments IS '수납 기록 테이블';
COMMENT ON VIEW invoice_details IS '청구서 상세 정보 뷰 (학생 정보, 항목, 수납 기록 포함)';
