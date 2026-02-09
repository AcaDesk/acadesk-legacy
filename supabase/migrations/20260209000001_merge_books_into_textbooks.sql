-- Migration: Merge books table into textbooks
-- books 테이블을 textbooks로 통합하고, book_lendings의 FK를 변경합니다.

-- 1) textbooks 테이블에 author, barcode 컬럼 추가
ALTER TABLE public.textbooks ADD COLUMN IF NOT EXISTS author text;
ALTER TABLE public.textbooks ADD COLUMN IF NOT EXISTS barcode text;

-- 2) textbooks에 barcode unique 인덱스 추가 (tenant 범위, soft-delete 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_textbooks_tenant_barcode
  ON public.textbooks(tenant_id, barcode)
  WHERE deleted_at IS NULL AND barcode IS NOT NULL;

-- 3) 기존 books 데이터를 textbooks로 마이그레이션
INSERT INTO public.textbooks (id, tenant_id, title, author, barcode, is_active, created_at, updated_at, deleted_at)
SELECT id, tenant_id, title, author, barcode, active, created_at, updated_at, deleted_at
FROM public.books
ON CONFLICT (id) DO NOTHING;

-- 4) book_lendings.book_id → textbook_id 로 컬럼 이름 변경
ALTER TABLE public.book_lendings RENAME COLUMN book_id TO textbook_id;

-- 5) 기존 books FK 제거 후 textbooks FK로 변경
ALTER TABLE public.book_lendings DROP CONSTRAINT IF EXISTS book_lendings_book_id_fkey;
ALTER TABLE public.book_lendings
  ADD CONSTRAINT book_lendings_textbook_id_fkey
  FOREIGN KEY (textbook_id) REFERENCES public.textbooks(id) ON DELETE CASCADE;

-- 6) 기존 인덱스 교체 (book_id → textbook_id)
DROP INDEX IF EXISTS idx_lendings_book;
CREATE INDEX IF NOT EXISTS idx_lendings_textbook ON public.book_lendings(textbook_id);

-- 7) books 테이블 삭제
DROP TABLE IF EXISTS public.books CASCADE;

-- 8) grants 갱신: textbooks에 select + CRUD 권한 추가
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.textbooks TO authenticated;
