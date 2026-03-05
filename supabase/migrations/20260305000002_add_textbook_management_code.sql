-- 교재 관리번호(management_code) 컬럼 추가
-- 바코드(barcode)는 스캐너용 식별자이며, 관리번호는 원내 자체 코드(예: 수학-01, T-001)로 별도 관리

ALTER TABLE public.textbooks
  ADD COLUMN IF NOT EXISTS management_code text;

-- 테넌트 내 유일값 보장 (soft-delete 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_textbooks_tenant_management_code
  ON public.textbooks(tenant_id, management_code)
  WHERE deleted_at IS NULL AND management_code IS NOT NULL;
