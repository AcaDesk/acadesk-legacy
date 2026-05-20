-- Fix: Add 'enrollment' activity type to match trigger usage
-- The trigger uses 'enrollment' but ref_activity_types only had 'student_enroll'

INSERT INTO ref_activity_types (code, label, description, icon, color, sort_order)
VALUES ('enrollment', '학원 입회', '학원 등록 (자동 생성)', 'UserPlus', 'default', 79)
ON CONFLICT (code) DO NOTHING;
