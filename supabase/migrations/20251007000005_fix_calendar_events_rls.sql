-- Fix calendar_events RLS policies to allow insertion
-- created_by 자동 설정 트리거 추가

-- created_by 자동 설정 트리거 함수
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- calendar_events 테이블에 트리거 적용
DROP TRIGGER IF EXISTS set_calendar_events_created_by ON calendar_events;
CREATE TRIGGER set_calendar_events_created_by
  BEFORE INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by();

-- RLS 정책 재설정: INSERT 정책 단순화
DROP POLICY IF EXISTS calendar_events_create ON calendar_events;
CREATE POLICY calendar_events_create ON calendar_events
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_current_tenant_id())
    AND get_current_user_role() IN ('owner', 'instructor', 'assistant')
  );

-- 코멘트 추가
COMMENT ON FUNCTION set_created_by() IS '생성자를 자동으로 현재 사용자로 설정하는 트리거 함수';
