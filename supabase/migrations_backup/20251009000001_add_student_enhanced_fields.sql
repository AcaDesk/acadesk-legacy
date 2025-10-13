-- Add enhanced student fields for better management
-- Student type, region, and shuttle bus information

-- 1. Add new columns to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS student_type TEXT,
  ADD COLUMN IF NOT EXISTS student_region TEXT,
  ADD COLUMN IF NOT EXISTS uses_shuttle_bus BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shuttle_bus_location TEXT;

-- 2. Create reference table for student types
CREATE TABLE IF NOT EXISTS ref_student_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert common student types
INSERT INTO ref_student_types (code, label, description, sort_order)
VALUES
  ('elementary', '초등부', '초등학생', 1),
  ('middle', '중등부', '중학생', 2),
  ('high', '고등부', '고등학생', 3),
  ('prep_high1', '예비 고1', '예비 고등학교 1학년', 4),
  ('prep_middle1', '예비 중1', '예비 중학교 1학년', 5),
  ('repeat', '재수생', '재수생', 6),
  ('adult', '성인', '성인 학습자', 7)
ON CONFLICT (code) DO NOTHING;

-- 4. Create reference table for regions
CREATE TABLE IF NOT EXISTS ref_student_regions (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  parent_code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Insert common regions (example: Busan districts)
INSERT INTO ref_student_regions (code, label, parent_code, sort_order)
VALUES
  ('haeundae', '해운대구', NULL, 1),
  ('suyeong', '수영구', NULL, 2),
  ('nam', '남구', NULL, 3),
  ('busanjin', '부산진구', NULL, 4),
  ('dong', '동구', NULL, 5),
  ('seo', '서구', NULL, 6),
  ('jung', '중구', NULL, 7),
  ('yeongdo', '영도구', NULL, 8),
  ('buk', '북구', NULL, 9),
  ('sasang', '사상구', NULL, 10),
  ('geumjeong', '금정구', NULL, 11),
  ('gangseo', '강서구', NULL, 12),
  ('yeonje', '연제구', NULL, 13),
  ('saha', '사하구', NULL, 14),
  ('gijang', '기장군', NULL, 15),
  ('other', '기타', NULL, 99)
ON CONFLICT (code) DO NOTHING;

-- 6. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_students_student_type ON students(student_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_student_region ON students(student_region) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_shuttle_bus ON students(uses_shuttle_bus) WHERE deleted_at IS NULL AND uses_shuttle_bus = true;

-- 7. Add comments
COMMENT ON COLUMN students.student_type IS 'Student classification type (elementary, middle, high, etc.)';
COMMENT ON COLUMN students.student_region IS 'Student residential region code';
COMMENT ON COLUMN students.uses_shuttle_bus IS 'Whether student uses shuttle bus service';
COMMENT ON COLUMN students.shuttle_bus_location IS 'Shuttle bus pickup/dropoff location';

COMMENT ON TABLE ref_student_types IS 'Reference table for student type classifications';
COMMENT ON TABLE ref_student_regions IS 'Reference table for student residential regions';
