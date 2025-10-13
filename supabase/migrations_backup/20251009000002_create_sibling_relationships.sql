-- Create sibling relationship tracking system
-- Allows linking students as siblings for family discounts and management

-- 1. Create student_siblings table
CREATE TABLE IF NOT EXISTS student_siblings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sibling_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ,

  -- Ensure we don't create duplicate or self-referential relationships
  CONSTRAINT student_siblings_no_self_ref CHECK (student_id != sibling_id),
  CONSTRAINT student_siblings_unique_pair UNIQUE (tenant_id, student_id, sibling_id)
);

-- 2. Create indexes
CREATE INDEX idx_student_siblings_student_id ON student_siblings(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_siblings_sibling_id ON student_siblings(sibling_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_student_siblings_tenant_id ON student_siblings(tenant_id) WHERE deleted_at IS NULL;

-- 3. Enable RLS
ALTER TABLE student_siblings ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view sibling relationships in their tenant"
  ON student_siblings FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Staff can manage sibling relationships"
  ON student_siblings FOR ALL
  USING (
    tenant_id = get_current_tenant_id() AND
    get_current_user_role() IN ('owner', 'instructor', 'assistant')
  );

-- 5. Function to automatically create reciprocal sibling relationship
CREATE OR REPLACE FUNCTION create_reciprocal_sibling_relationship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create reciprocal if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM student_siblings
    WHERE tenant_id = NEW.tenant_id
      AND student_id = NEW.sibling_id
      AND sibling_id = NEW.student_id
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO student_siblings (
      tenant_id,
      student_id,
      sibling_id,
      relationship_note,
      created_by
    ) VALUES (
      NEW.tenant_id,
      NEW.sibling_id,
      NEW.student_id,
      NEW.relationship_note,
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to maintain reciprocal relationships
CREATE TRIGGER trg_create_reciprocal_sibling
  AFTER INSERT ON student_siblings
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION create_reciprocal_sibling_relationship();

-- 7. View for easy sibling lookup with student details
CREATE OR REPLACE VIEW v_student_siblings AS
SELECT
  ss.id,
  ss.tenant_id,
  ss.student_id,
  s1.student_code AS student_code,
  u1.name AS student_name,
  s1.grade AS student_grade,
  s1.birth_date AS student_birth_date,
  ss.sibling_id,
  s2.student_code AS sibling_code,
  u2.name AS sibling_name,
  s2.grade AS sibling_grade,
  s2.birth_date AS sibling_birth_date,
  ss.relationship_note,
  ss.created_at
FROM student_siblings ss
JOIN students s1 ON ss.student_id = s1.id AND s1.deleted_at IS NULL
JOIN users u1 ON s1.user_id = u1.id AND u1.deleted_at IS NULL
JOIN students s2 ON ss.sibling_id = s2.id AND s2.deleted_at IS NULL
JOIN users u2 ON s2.user_id = u2.id AND u2.deleted_at IS NULL
WHERE ss.deleted_at IS NULL;

-- 8. Add comments
COMMENT ON TABLE student_siblings IS 'Tracks sibling relationships between students for family management and discounts';
COMMENT ON COLUMN student_siblings.student_id IS 'Reference to the first student in the sibling relationship';
COMMENT ON COLUMN student_siblings.sibling_id IS 'Reference to the sibling student';
COMMENT ON COLUMN student_siblings.relationship_note IS 'Optional note about the sibling relationship';
