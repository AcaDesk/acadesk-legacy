-- Migration: Fix textbook tables service_role grants
-- textbook 관련 테이블에 service_role 권한 추가
-- Server Action에서 createServiceRoleClient()를 통해 접근할 때
-- 42501 insufficient_privilege 오류가 발생하는 문제 수정

-- 1) textbooks: service_role에 전체 권한 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.textbooks TO service_role;

-- 2) textbook_units
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.textbook_units TO service_role;

-- 3) student_textbooks
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_textbooks TO service_role;

-- 4) textbook_progress
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.textbook_progress TO service_role;

-- 5) book_lendings (통합된 대출 테이블)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_lendings') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.book_lendings TO service_role';
  END IF;
END $$;

-- 6) RLS가 의도치 않게 활성화된 경우를 대비하여 명시적으로 비활성화
ALTER TABLE public.textbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbook_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_textbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.textbook_progress DISABLE ROW LEVEL SECURITY;
