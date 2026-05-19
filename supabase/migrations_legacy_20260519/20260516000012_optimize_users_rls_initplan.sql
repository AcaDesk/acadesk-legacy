-- users 정책 InitPlan 최적화 (옵션 G-1)
--
-- 옵션 E1 에서 users 테이블 RLS 활성화 후 advisor 에 새로 잡힌 3건.
-- 정책 자체는 이전부터 존재했으나 RLS disabled 라 advisor 가 인지하지 못함.
-- auth.uid() 를 (SELECT auth.uid()) 로 감싸 row 마다 재평가되지 않게 변경.

ALTER POLICY users_select_self ON public.users
  USING (id = (SELECT auth.uid()) AND deleted_at IS NULL);

ALTER POLICY users_update_self ON public.users
  USING (id = (SELECT auth.uid()) AND deleted_at IS NULL)
  WITH CHECK (id = (SELECT auth.uid()));

ALTER POLICY users_insert_signup ON public.users
  WITH CHECK (
    id = (SELECT auth.uid())
    AND tenant_id IS NULL
    AND role_code IS NULL
    AND approval_status IS NULL
    AND onboarding_completed = false
  );
