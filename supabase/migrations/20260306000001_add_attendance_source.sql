-- attendance 테이블에 출석 기록 출처 컬럼 추가
-- source: 'kiosk' (키오스크 자동 등록) | 'manual' (원장/강사 수동 처리)
-- NULL = 이 기능 도입 이전 기록

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS source TEXT
    CHECK (source IN ('kiosk', 'manual'));

COMMENT ON COLUMN attendance.source IS '출석 기록 출처: kiosk(키오스크 자동 등록) | manual(원장/강사 수동 처리)';
