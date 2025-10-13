-- Create in-app notifications table for user notifications in the system
-- This is different from external notifications (SMS, email) to guardians

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL, -- 'todo_verified', 'new_message', 'attendance_alert', 'consultation_scheduled', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Optional reference to related entities
  reference_type TEXT, -- 'student', 'todo', 'class', 'consultation', 'report', etc.
  reference_id UUID,

  -- Action URL (where to navigate when clicked)
  action_url TEXT,

  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX idx_in_app_notifications_tenant ON in_app_notifications(tenant_id);
CREATE INDEX idx_in_app_notifications_user ON in_app_notifications(user_id);
CREATE INDEX idx_in_app_notifications_is_read ON in_app_notifications(is_read);
CREATE INDEX idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);
CREATE INDEX idx_in_app_notifications_type ON in_app_notifications(type);

-- Composite index for efficient unread notification queries
CREATE INDEX idx_in_app_notifications_user_unread ON in_app_notifications(user_id, is_read, created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_in_app_notifications_updated_at
  BEFORE UPDATE ON in_app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
  ON in_app_notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create notifications for users in tenant"
  ON in_app_notifications
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON in_app_notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own notifications"
  ON in_app_notifications
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Comment on table and columns
COMMENT ON TABLE in_app_notifications IS 'In-app notifications shown to users in the system header';
COMMENT ON COLUMN in_app_notifications.type IS 'Type of notification for filtering and styling';
COMMENT ON COLUMN in_app_notifications.reference_type IS 'Type of entity this notification references';
COMMENT ON COLUMN in_app_notifications.reference_id IS 'ID of the referenced entity';
COMMENT ON COLUMN in_app_notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN in_app_notifications.is_read IS 'Whether the user has read this notification';
