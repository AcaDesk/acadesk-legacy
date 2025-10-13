-- =====================================================
-- RLS Policies for Student Activity Logs
-- =====================================================

-- Enable RLS
ALTER TABLE student_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ref_activity_types ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Policies for ref_activity_types (Reference Table)
-- =====================================================

-- Everyone can read activity types
CREATE POLICY "Activity types are viewable by everyone"
  ON ref_activity_types
  FOR SELECT
  USING (true);

-- =====================================================
-- Policies for student_activity_logs
-- =====================================================

-- Helper function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION belongs_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT: Users can view logs for students in their tenant
CREATE POLICY "Users can view activity logs in their tenant"
  ON student_activity_logs
  FOR SELECT
  USING (
    belongs_to_tenant(tenant_id)
    AND deleted_at IS NULL
  );

-- INSERT: Authenticated users can create logs
CREATE POLICY "Authenticated users can create activity logs"
  ON student_activity_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND belongs_to_tenant(tenant_id)
  );

-- UPDATE: Only creator or admin can update logs
CREATE POLICY "Creators and admins can update activity logs"
  ON student_activity_logs
  FOR UPDATE
  USING (
    belongs_to_tenant(tenant_id)
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role_code IN ('admin', 'instructor')
        AND deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    belongs_to_tenant(tenant_id)
  );

-- DELETE (Soft Delete): Only admin can delete
CREATE POLICY "Admins can soft delete activity logs"
  ON student_activity_logs
  FOR UPDATE
  USING (
    belongs_to_tenant(tenant_id)
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role_code = 'admin'
      AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    belongs_to_tenant(tenant_id)
  );

-- =====================================================
-- GRANT permissions
-- =====================================================

GRANT SELECT ON ref_activity_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON student_activity_logs TO authenticated;
