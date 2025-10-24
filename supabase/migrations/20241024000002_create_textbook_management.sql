-- ======================================================================
-- 0) Prereqs: 부모 테이블에 (tenant_id, id) 유니크 키 (없으면 추가)
-- ======================================================================
ALTER TABLE public.students
  ADD CONSTRAINT students_tenant_id_id_unique UNIQUE (tenant_id, id);

ALTER TABLE public.users
  ADD CONSTRAINT users_tenant_id_id_unique UNIQUE (tenant_id, id);

-- ======================================================================
-- 1) 교재 마스터 (textbooks)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- 기본 정보
  title TEXT NOT NULL,
  publisher TEXT,
  isbn TEXT,
  price INTEGER,                -- 원 단위 (null 허용)
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- 제약
  CONSTRAINT chk_textbooks_price_nonneg CHECK (price IS NULL OR price >= 0)
);

-- (복합 FK 타겟을 위한 유니크 키)
ALTER TABLE public.textbooks
  ADD CONSTRAINT textbooks_tenant_id_id_unique UNIQUE (tenant_id, id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_textbooks_tenant_active
  ON public.textbooks(tenant_id)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_textbooks_tenant_created_desc
  ON public.textbooks(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- (선택) 테넌트 내 ISBN 유니크
CREATE UNIQUE INDEX IF NOT EXISTS idx_textbooks_tenant_isbn_unique
  ON public.textbooks(tenant_id, isbn)
  WHERE deleted_at IS NULL AND isbn IS NOT NULL;

-- RLS 해제
ALTER TABLE public.textbooks DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.textbooks IS '교재 마스터';
COMMENT ON COLUMN public.textbooks.title IS '교재명';
COMMENT ON COLUMN public.textbooks.is_active IS '활성 여부';

-- ======================================================================
-- 2) 교재 단원 (textbook_units)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.textbook_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  textbook_id UUID NOT NULL,

  unit_order INTEGER NOT NULL,  -- 1,2,3...
  unit_code TEXT,               -- 예: U1, CH2
  unit_title TEXT NOT NULL,     -- 예: 분수의 덧셈
  total_pages INTEGER,          -- 선택

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 같은 테넌트 강제(복합 FK)
ALTER TABLE public.textbook_units
  ADD CONSTRAINT textbook_units_textbook_fk
  FOREIGN KEY (tenant_id, textbook_id)
  REFERENCES public.textbooks(tenant_id, id)
  ON DELETE CASCADE;

-- 유니크 & 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_textbook_units_unique
  ON public.textbook_units(tenant_id, textbook_id, unit_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_textbook_units_tenant_textbook_order
  ON public.textbook_units(tenant_id, textbook_id, unit_order)
  WHERE deleted_at IS NULL;

ALTER TABLE public.textbook_units DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.textbook_units IS '교재 단원(챕터/유닛)';
COMMENT ON COLUMN public.textbook_units.unit_order IS '단원 순서';

-- ======================================================================
-- 3) 학생별 교재 배부/결제 (student_textbooks)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.student_textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  textbook_id UUID NOT NULL,

  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'in_use',   -- in_use | completed | returned
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_student_textbooks_status CHECK (
    status IN ('in_use', 'completed', 'returned')
  )
);

-- 같은 테넌트 강제(복합 FK)
ALTER TABLE public.student_textbooks
  ADD CONSTRAINT student_textbooks_student_fk
  FOREIGN KEY (tenant_id, student_id)
  REFERENCES public.students(tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.student_textbooks
  ADD CONSTRAINT student_textbooks_textbook_fk
  FOREIGN KEY (tenant_id, textbook_id)
  REFERENCES public.textbooks(tenant_id, id)
  ON DELETE RESTRICT;

-- 중복 배부 방지(진행중만)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_textbooks_unique_in_use
  ON public.student_textbooks(tenant_id, student_id, textbook_id)
  WHERE deleted_at IS NULL AND status = 'in_use';

-- 조회/조인 인덱스
CREATE INDEX IF NOT EXISTS idx_student_textbooks_student
  ON public.student_textbooks(student_id, issue_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_textbooks_textbook
  ON public.student_textbooks(textbook_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_textbooks_unpaid
  ON public.student_textbooks(tenant_id, paid)
  WHERE deleted_at IS NULL AND paid = false;

CREATE INDEX IF NOT EXISTS idx_student_textbooks_tenant_student_textbook
  ON public.student_textbooks(tenant_id, student_id, textbook_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.student_textbooks DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.student_textbooks IS '학생별 교재 배부/결제';
COMMENT ON COLUMN public.student_textbooks.status IS 'in_use | completed | returned';

-- ======================================================================
-- 4) 교재 진도 기록 (textbook_progress)
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.textbook_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  textbook_id UUID NOT NULL,
  unit_id UUID,                      -- 단원(선택): 다른 테넌트 참조 방지는 앱 레벨에서

  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pages_done INTEGER,
  percent_done NUMERIC(5,2),
  memo TEXT,

  recorded_by UUID NOT NULL,         -- 강사(user)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_textbook_progress_percent CHECK (
    percent_done IS NULL OR (percent_done >= 0 AND percent_done <= 100)
  ),
  CONSTRAINT chk_textbook_progress_pages CHECK (
    pages_done IS NULL OR pages_done >= 0
  )
);

-- 같은 테넌트 강제(복합 FK)
ALTER TABLE public.textbook_progress
  ADD CONSTRAINT textbook_progress_student_fk
  FOREIGN KEY (tenant_id, student_id)
  REFERENCES public.students(tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.textbook_progress
  ADD CONSTRAINT textbook_progress_textbook_fk
  FOREIGN KEY (tenant_id, textbook_id)
  REFERENCES public.textbooks(tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.textbook_progress
  ADD CONSTRAINT textbook_progress_recorded_by_fk
  FOREIGN KEY (tenant_id, recorded_by)
  REFERENCES public.users(tenant_id, id)
  ON DELETE RESTRICT;

-- 단원 존재성(FK)만 유지 (테넌트 교차는 앱에서 방지)
ALTER TABLE public.textbook_progress
  ADD CONSTRAINT textbook_progress_unit_fk
  FOREIGN KEY (unit_id)
  REFERENCES public.textbook_units(id)
  ON DELETE SET NULL;

-- 조회/조인 인덱스
CREATE INDEX IF NOT EXISTS idx_progress_tenant_student_textbook_date
  ON public.textbook_progress(tenant_id, student_id, textbook_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_progress_textbook_date
  ON public.textbook_progress(textbook_id, date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_progress_unit
  ON public.textbook_progress(unit_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_progress_recorder
  ON public.textbook_progress(recorded_by, date DESC)
  WHERE deleted_at IS NULL;

ALTER TABLE public.textbook_progress DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.textbook_progress IS '교재 진도 기록';
COMMENT ON COLUMN public.textbook_progress.recorded_by IS '기록자(강사)';

-- ======================================================================
-- 완료
-- ======================================================================