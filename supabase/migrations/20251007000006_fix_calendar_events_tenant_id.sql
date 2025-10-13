-- Fix calendar_events to auto-set tenant_id
-- tenant_id를 자동으로 현재 테넌트로 설정

-- created_by와 tenant_id를 자동 설정하는 트리거 함수로 업데이트
CREATE OR REPLACE FUNCTION set_created_by_and_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- tenant_id가 없으면 현재 테넌트로 설정
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_current_tenant_id();
  END IF;

  -- created_by가 없으면 현재 사용자로 설정
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 함수 대체
DROP TRIGGER IF EXISTS set_calendar_events_created_by ON calendar_events;
CREATE TRIGGER set_calendar_events_created_by_and_tenant
  BEFORE INSERT ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by_and_tenant();

-- 코멘트 업데이트
COMMENT ON FUNCTION set_created_by_and_tenant() IS '생성자와 테넌트 ID를 자동으로 현재 컨텍스트로 설정하는 트리거 함수';
