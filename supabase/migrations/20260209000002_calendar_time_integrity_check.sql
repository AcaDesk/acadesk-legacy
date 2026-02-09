-- calendar_events 테이블에 시간 무결성 CHECK 제약 추가
-- end_at이 start_at보다 이전이 될 수 없도록 보장

ALTER TABLE calendar_events
  ADD CONSTRAINT chk_calendar_events_end_after_start
  CHECK (end_at >= start_at);
