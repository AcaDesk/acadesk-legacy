-- 20260303000001_add_notification_columns.sql
-- in_app_notifications 테이블에 누락된 컬럼 추가 및 RLS/인덱스 정비

-- =============================================================================
-- 1. 컬럼 추가 (이미 존재하면 무시)
-- =============================================================================

ALTER TABLE public.in_app_notifications
  ADD COLUMN IF NOT EXISTS read_at    timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- =============================================================================
-- 2. updated_at 자동 갱신 트리거
-- =============================================================================

-- set_updated_at() 함수는 이미 public 스키마에 존재 (batch_workbench 마이그레이션에서 생성됨)
-- 존재하지 않을 경우를 대비해 CREATE OR REPLACE로 보장
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_in_app_notifications_updated_at ON public.in_app_notifications;
CREATE TRIGGER trg_in_app_notifications_updated_at
  BEFORE UPDATE ON public.in_app_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 3. RLS 활성화 및 정책
-- =============================================================================

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성 (idempotent)
DROP POLICY IF EXISTS "Users can view own notifications"    ON public.in_app_notifications;
DROP POLICY IF EXISTS "Users can update own notifications"  ON public.in_app_notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.in_app_notifications;

-- 본인 알림만 SELECT
CREATE POLICY "Users can view own notifications"
  ON public.in_app_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- 본인 알림만 UPDATE (읽음 처리)
CREATE POLICY "Users can update own notifications"
  ON public.in_app_notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- service_role은 RLS 우회 (INSERT/UPDATE/DELETE)
-- service_role은 기본적으로 RLS를 우회하지만 명시적으로 grant 부여
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.in_app_notifications
  TO service_role;

-- authenticated 사용자에게 SELECT, UPDATE 권한 부여
GRANT SELECT, UPDATE
  ON public.in_app_notifications
  TO authenticated;

-- =============================================================================
-- 4. 미읽음 전용 부분 인덱스 (벨 배지 카운트 최적화)
-- =============================================================================

DROP INDEX IF EXISTS idx_notif_unread_user;
CREATE INDEX idx_notif_unread_user
  ON public.in_app_notifications (user_id, created_at DESC)
  WHERE is_read = false;
