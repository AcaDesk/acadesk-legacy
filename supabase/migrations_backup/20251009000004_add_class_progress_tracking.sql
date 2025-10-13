-- Add class progress tracking system
-- Allows instructors to record daily lesson content and track curriculum progress

-- 1. Create class_sessions table for tracking individual class meetings
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_number INTEGER,
  topic TEXT NOT NULL,
  content TEXT,
  homework_assigned TEXT,
  materials_used TEXT,
  notes TEXT,
  taught_by UUID REFERENCES users(id),
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT class_sessions_unique_date UNIQUE (tenant_id, class_id, session_date)
);

-- 2. Create student_class_progress table for individual student progress
CREATE TABLE IF NOT EXISTS student_class_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  understanding_level TEXT CHECK (understanding_level IN ('excellent', 'good', 'fair', 'needs_improvement')),
  participation_level TEXT CHECK (participation_level IN ('active', 'moderate', 'passive')),
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT student_class_progress_unique UNIQUE (tenant_id, student_id, class_session_id)
);

-- 3. Create indexes
CREATE INDEX idx_class_sessions_class_id ON class_sessions(class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_class_sessions_tenant_id ON class_sessions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_class_sessions_session_date ON class_sessions(session_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_class_progress_student_id ON student_class_progress(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_class_progress_class_session_id ON student_class_progress(class_session_id) WHERE deleted_at IS NULL;

-- 4. Enable RLS
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_progress ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for class_sessions
CREATE POLICY "Users can view class sessions in their tenant"
  ON class_sessions FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Instructors can manage class sessions"
  ON class_sessions FOR ALL
  USING (
    tenant_id = get_current_tenant_id() AND
    get_current_user_role() IN ('owner', 'instructor', 'assistant')
  );

-- 6. RLS Policies for student_class_progress
CREATE POLICY "Users can view student progress in their tenant"
  ON student_class_progress FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Instructors can manage student progress"
  ON student_class_progress FOR ALL
  USING (
    tenant_id = get_current_tenant_id() AND
    get_current_user_role() IN ('owner', 'instructor', 'assistant')
  );

-- 7. Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_class_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_class_session_timestamp
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_class_session_timestamp();

CREATE TRIGGER trg_update_student_progress_timestamp
  BEFORE UPDATE ON student_class_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_class_session_timestamp();

-- 8. Trigger to log class sessions to student activity
CREATE OR REPLACE FUNCTION log_class_session_to_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_student RECORD;
  v_class_name TEXT;
BEGIN
  -- Get class name
  SELECT name INTO v_class_name
  FROM classes
  WHERE id = NEW.class_id;

  -- Create activity log for each enrolled student
  FOR v_student IN
    SELECT DISTINCT ce.student_id
    FROM class_enrollments ce
    WHERE ce.class_id = NEW.class_id
      AND ce.tenant_id = NEW.tenant_id
      AND ce.deleted_at IS NULL
      AND (ce.end_date IS NULL OR ce.end_date >= NEW.session_date)
  LOOP
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata
    ) VALUES (
      NEW.tenant_id,
      v_student.student_id,
      'class_session',
      NEW.session_date,
      v_class_name || ' - ' || NEW.topic,
      NEW.content,
      jsonb_build_object(
        'class_id', NEW.class_id,
        'class_session_id', NEW.id,
        'homework', NEW.homework_assigned,
        'materials', NEW.materials_used
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_class_session_to_activity
  AFTER INSERT ON class_sessions
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION log_class_session_to_activity();

-- 9. View for student progress overview
CREATE OR REPLACE VIEW v_student_class_progress_summary AS
SELECT
  scp.student_id,
  scp.tenant_id,
  cs.class_id,
  c.name AS class_name,
  COUNT(scp.id) AS total_sessions,
  COUNT(scp.id) FILTER (WHERE scp.understanding_level = 'excellent') AS excellent_count,
  COUNT(scp.id) FILTER (WHERE scp.understanding_level = 'good') AS good_count,
  COUNT(scp.id) FILTER (WHERE scp.understanding_level = 'fair') AS fair_count,
  COUNT(scp.id) FILTER (WHERE scp.understanding_level = 'needs_improvement') AS needs_improvement_count,
  MAX(cs.session_date) AS last_session_date
FROM student_class_progress scp
JOIN class_sessions cs ON scp.class_session_id = cs.id AND cs.deleted_at IS NULL
JOIN classes c ON cs.class_id = c.id AND c.deleted_at IS NULL
WHERE scp.deleted_at IS NULL
GROUP BY scp.student_id, scp.tenant_id, cs.class_id, c.name;

-- 10. Add comments
COMMENT ON TABLE class_sessions IS 'Records of individual class meetings with topics and content taught';
COMMENT ON TABLE student_class_progress IS 'Tracks individual student progress and understanding for each class session';
COMMENT ON COLUMN class_sessions.topic IS 'Main topic or lesson title for this session';
COMMENT ON COLUMN class_sessions.content IS 'Detailed description of what was taught';
COMMENT ON COLUMN class_sessions.homework_assigned IS 'Homework or assignments given during this session';
COMMENT ON COLUMN student_class_progress.understanding_level IS 'Student comprehension level for this session';
COMMENT ON COLUMN student_class_progress.participation_level IS 'Student participation level during this session';
