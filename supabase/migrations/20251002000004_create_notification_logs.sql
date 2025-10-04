-- Create notification_logs table for tracking communications with guardians
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('phone', 'sms', 'email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  message TEXT NOT NULL,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Add indexes for common queries
CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id);
CREATE INDEX idx_notification_logs_student ON notification_logs(student_id);
CREATE INDEX idx_notification_logs_guardian ON notification_logs(guardian_id);
CREATE INDEX idx_notification_logs_session ON notification_logs(session_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_logs_updated_at
  BEFORE UPDATE ON notification_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view notification logs in their tenant"
  ON notification_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create notification logs in their tenant"
  ON notification_logs
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update notification logs in their tenant"
  ON notification_logs
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Comment on table and columns
COMMENT ON TABLE notification_logs IS 'Logs of all communications sent to guardians regarding students';
COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification: phone, sms, email, push';
COMMENT ON COLUMN notification_logs.status IS 'Status of the notification: pending, sent, failed, delivered, read';
COMMENT ON COLUMN notification_logs.message IS 'Content or summary of the message sent';
COMMENT ON COLUMN notification_logs.notes IS 'Additional notes about the communication (e.g., guardian response)';
COMMENT ON COLUMN notification_logs.sent_at IS 'When the notification was sent';
COMMENT ON COLUMN notification_logs.delivered_at IS 'When the notification was delivered (if applicable)';
COMMENT ON COLUMN notification_logs.read_at IS 'When the notification was read (if applicable)';
