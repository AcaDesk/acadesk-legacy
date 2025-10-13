-- Automatic Calendar Event Synchronization
-- 수업, 시험 등 기존 데이터를 자동으로 캘린더 이벤트로 동기화

-- 함수: 수업에서 캘린더 이벤트 생성/업데이트
CREATE OR REPLACE FUNCTION sync_class_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  event_description TEXT;
BEGIN
  -- 수업 제목 생성
  event_title := '[수업] ' || NEW.name;
  event_description := '과목: ' || COALESCE(NEW.subject, '미지정');

  -- INSERT 또는 UPDATE 시
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- 기존 캘린더 이벤트가 있으면 업데이트, 없으면 생성
    INSERT INTO calendar_events (
      tenant_id,
      title,
      description,
      event_type,
      start_at,
      end_at,
      all_day,
      class_id,
      color
    ) VALUES (
      NEW.tenant_id,
      event_title,
      event_description,
      'class',
      NOW(), -- 실제로는 class schedule 정보를 사용해야 함
      NOW() + INTERVAL '1 hour',
      false,
      NEW.id,
      '#3b82f6' -- blue color for classes
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      updated_at = NOW();

    RETURN NEW;
  END IF;

  -- DELETE 시 연관된 캘린더 이벤트도 soft delete
  IF (TG_OP = 'DELETE') THEN
    UPDATE calendar_events
    SET deleted_at = NOW()
    WHERE class_id = OLD.id AND deleted_at IS NULL;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 함수: 시험에서 캘린더 이벤트 생성/업데이트
CREATE OR REPLACE FUNCTION sync_exam_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
  event_title TEXT;
  event_description TEXT;
BEGIN
  -- 시험 제목 생성
  event_title := '[시험] ' || NEW.title;
  event_description := COALESCE(NEW.description, '');

  -- INSERT 또는 UPDATE 시
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- 기존 캘린더 이벤트가 있으면 업데이트, 없으면 생성
    INSERT INTO calendar_events (
      tenant_id,
      title,
      description,
      event_type,
      start_at,
      end_at,
      all_day,
      exam_id,
      color
    ) VALUES (
      NEW.tenant_id,
      event_title,
      event_description,
      'exam',
      NEW.exam_date,
      NEW.exam_date + INTERVAL '2 hours', -- 시험은 기본 2시간
      false,
      NEW.id,
      '#8b5cf6' -- purple color for exams
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      start_at = EXCLUDED.start_at,
      end_at = EXCLUDED.end_at,
      updated_at = NOW();

    RETURN NEW;
  END IF;

  -- DELETE 시 연관된 캘린더 이벤트도 soft delete
  IF (TG_OP = 'DELETE') THEN
    UPDATE calendar_events
    SET deleted_at = NOW()
    WHERE exam_id = OLD.id AND deleted_at IS NULL;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성: 수업 동기화 (classes 테이블이 존재하는 경우에만)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'classes'
  ) THEN
    -- 기존 트리거 삭제
    DROP TRIGGER IF EXISTS sync_class_to_calendar_trigger ON classes;

    -- 새 트리거 생성
    CREATE TRIGGER sync_class_to_calendar_trigger
      AFTER INSERT OR UPDATE OR DELETE ON classes
      FOR EACH ROW
      EXECUTE FUNCTION sync_class_to_calendar();
  END IF;
END$$;

-- 트리거 생성: 시험 동기화 (exams 테이블이 존재하는 경우에만)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'exams'
  ) THEN
    -- 기존 트리거 삭제
    DROP TRIGGER IF EXISTS sync_exam_to_calendar_trigger ON exams;

    -- 새 트리거 생성
    CREATE TRIGGER sync_exam_to_calendar_trigger
      AFTER INSERT OR UPDATE OR DELETE ON exams
      FOR EACH ROW
      EXECUTE FUNCTION sync_exam_to_calendar();
  END IF;
END$$;

COMMENT ON FUNCTION sync_class_to_calendar() IS '수업 데이터를 캘린더 이벤트로 자동 동기화하는 트리거 함수';
COMMENT ON FUNCTION sync_exam_to_calendar() IS '시험 데이터를 캘린더 이벤트로 자동 동기화하는 트리거 함수';
