-- =====================================================
-- Library System - Books and Lending Management
-- =====================================================

-- Library Books Table
CREATE TABLE library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Book Information
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),
  publisher VARCHAR(255),
  isbn VARCHAR(13), -- ISBN-13 format
  category VARCHAR(100), -- 소설, 영어원서, 수학교재 등
  level VARCHAR(50), -- 독서 레벨 (예: AR 3.5, Lexile 700L)

  -- Physical Details
  barcode VARCHAR(50) UNIQUE, -- 바코드 번호
  location VARCHAR(100), -- 보관 위치 (예: 서가 A-3)
  cover_image_url TEXT,

  -- Metadata
  total_quantity INTEGER DEFAULT 1, -- 총 보유 수량
  available_quantity INTEGER DEFAULT 1, -- 대여 가능 수량
  notes TEXT, -- 비고 (훼손 여부 등)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Library Loans Table (대여 기록)
CREATE TABLE library_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,

  -- Loan Details
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE NOT NULL, -- 반납 예정일
  returned_at TIMESTAMPTZ, -- 실제 반납일 (null = 미반납)

  -- Status
  status VARCHAR(50) DEFAULT 'borrowed', -- borrowed, returned, overdue, lost
  overdue_days INTEGER DEFAULT 0, -- 연체 일수

  -- Notes
  notes TEXT, -- 대여/반납 시 메모
  condition_on_borrow TEXT, -- 대여 시 상태
  condition_on_return TEXT, -- 반납 시 상태

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_library_books_tenant_id ON library_books(tenant_id);
CREATE INDEX idx_library_books_isbn ON library_books(isbn);
CREATE INDEX idx_library_books_barcode ON library_books(barcode);
CREATE INDEX idx_library_books_category ON library_books(category);
CREATE INDEX idx_library_books_deleted_at ON library_books(deleted_at);

CREATE INDEX idx_library_loans_tenant_id ON library_loans(tenant_id);
CREATE INDEX idx_library_loans_student_id ON library_loans(student_id);
CREATE INDEX idx_library_loans_book_id ON library_loans(book_id);
CREATE INDEX idx_library_loans_status ON library_loans(status);
CREATE INDEX idx_library_loans_due_date ON library_loans(due_date);
CREATE INDEX idx_library_loans_returned_at ON library_loans(returned_at);
CREATE INDEX idx_library_loans_deleted_at ON library_loans(deleted_at);

-- Auto-update triggers
CREATE TRIGGER update_library_books_updated_at
  BEFORE UPDATE ON library_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_loans_updated_at
  BEFORE UPDATE ON library_loans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update available quantity when book is borrowed
CREATE OR REPLACE FUNCTION decrease_book_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE library_books
  SET available_quantity = available_quantity - 1
  WHERE id = NEW.book_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_loan_insert
  AFTER INSERT ON library_loans
  FOR EACH ROW
  WHEN (NEW.status = 'borrowed')
  EXECUTE FUNCTION decrease_book_quantity();

-- Function to update available quantity when book is returned
CREATE OR REPLACE FUNCTION increase_book_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    UPDATE library_books
    SET available_quantity = available_quantity + 1
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_loan_return
  AFTER UPDATE ON library_loans
  FOR EACH ROW
  EXECUTE FUNCTION increase_book_quantity();

-- =====================================================
-- ACTIVITY LOG TRIGGERS
-- =====================================================

-- Add foreign key reference to activity logs
ALTER TABLE student_activity_logs
  ADD COLUMN IF NOT EXISTS related_library_loan_id UUID REFERENCES library_loans(id) ON DELETE SET NULL;

-- Trigger: Create log when book is borrowed
CREATE OR REPLACE FUNCTION trigger_log_library_borrow()
RETURNS TRIGGER AS $$
DECLARE
  v_book_title VARCHAR(500);
BEGIN
  -- Get book title
  SELECT title INTO v_book_title FROM library_books WHERE id = NEW.book_id;

  PERFORM create_student_activity_log(
    p_student_id := NEW.student_id,
    p_activity_type := 'library_borrow',
    p_title := v_book_title,
    p_description := format('반납 예정일: %s', TO_CHAR(NEW.due_date, 'YYYY-MM-DD')),
    p_activity_date := NEW.borrowed_at,
    p_metadata := jsonb_build_object(
      'book_id', NEW.book_id,
      'loan_id', NEW.id,
      'due_date', NEW.due_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_library_loan_insert
  AFTER INSERT ON library_loans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_library_borrow();

-- Trigger: Create log when book is returned
CREATE OR REPLACE FUNCTION trigger_log_library_return()
RETURNS TRIGGER AS $$
DECLARE
  v_book_title VARCHAR(500);
  v_activity_type VARCHAR(50);
BEGIN
  -- Only log when returned_at is newly set
  IF NEW.returned_at IS NOT NULL AND OLD.returned_at IS NULL THEN
    -- Get book title
    SELECT title INTO v_book_title FROM library_books WHERE id = NEW.book_id;

    -- Determine if overdue
    v_activity_type := CASE
      WHEN NEW.returned_at::DATE > NEW.due_date THEN 'library_overdue'
      ELSE 'library_return'
    END;

    PERFORM create_student_activity_log(
      p_student_id := NEW.student_id,
      p_activity_type := v_activity_type,
      p_title := v_book_title,
      p_description := CASE
        WHEN NEW.returned_at::DATE > NEW.due_date THEN
          format('연체 %s일', (NEW.returned_at::DATE - NEW.due_date))
        ELSE '정상 반납'
      END,
      p_activity_date := NEW.returned_at,
      p_metadata := jsonb_build_object(
        'book_id', NEW.book_id,
        'loan_id', NEW.id,
        'borrowed_at', NEW.borrowed_at,
        'due_date', NEW.due_date,
        'returned_at', NEW.returned_at,
        'overdue_days', CASE
          WHEN NEW.returned_at::DATE > NEW.due_date THEN
            (NEW.returned_at::DATE - NEW.due_date)
          ELSE 0
        END
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_library_loan_return
  AFTER UPDATE ON library_loans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_library_return();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_loans ENABLE ROW LEVEL SECURITY;

-- Library Books Policies
CREATE POLICY "Users can view books in their tenant"
  ON library_books
  FOR SELECT
  USING (
    belongs_to_tenant(tenant_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins and instructors can manage books"
  ON library_books
  FOR ALL
  USING (
    belongs_to_tenant(tenant_id)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role_code IN ('admin', 'instructor')
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    belongs_to_tenant(tenant_id)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role_code IN ('admin', 'instructor')
      AND deleted_at IS NULL
    )
  );

-- Library Loans Policies
CREATE POLICY "Users can view loans in their tenant"
  ON library_loans
  FOR SELECT
  USING (
    belongs_to_tenant(tenant_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "Staff can create loans"
  ON library_loans
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND belongs_to_tenant(tenant_id)
  );

CREATE POLICY "Staff can update loans"
  ON library_loans
  FOR UPDATE
  USING (
    belongs_to_tenant(tenant_id)
  )
  WITH CHECK (
    belongs_to_tenant(tenant_id)
  );

-- =====================================================
-- GRANT permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON library_books TO authenticated;
GRANT SELECT, INSERT, UPDATE ON library_loans TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE library_books IS '원서/교재 도서 관리 테이블';
COMMENT ON TABLE library_loans IS '도서 대여 기록 테이블';
COMMENT ON COLUMN library_books.barcode IS '바코드 스캐너로 읽을 수 있는 고유 번호';
COMMENT ON COLUMN library_loans.status IS 'borrowed: 대여 중, returned: 반납 완료, overdue: 연체 중, lost: 분실';
