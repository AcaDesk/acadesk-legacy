-- calendar_events 테이블에 시간 무결성 CHECK 제약 추가
-- end_at이 start_at보다 이전이 될 수 없도록 보장

-- 1. 기존 위반 데이터 수정: end_at이 start_at보다 이전인 행은 end_at을 start_at으로 설정
UPDATE calendar_events
  SET end_at = start_at
  WHERE end_at < start_at;

-- 2. CHECK 제약 추가
ALTER TABLE calendar_events
  ADD CONSTRAINT chk_calendar_events_end_after_start
  CHECK (end_at >= start_at);
