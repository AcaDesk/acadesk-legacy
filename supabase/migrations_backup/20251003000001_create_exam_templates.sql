-- Create exam_templates table for reusable exam patterns
CREATE TABLE IF NOT EXISTS exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_pattern TEXT NOT NULL,
  category_code TEXT REFERENCES ref_exam_categories(code) ON DELETE SET NULL,
  exam_type TEXT,
  total_questions INTEGER,
  description TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none', 'weekly', 'monthly', 'custom')),
  recurrence_config JSONB,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX idx_exam_templates_tenant ON exam_templates(tenant_id);
CREATE INDEX idx_exam_templates_class ON exam_templates(class_id);
CREATE INDEX idx_exam_templates_active ON exam_templates(active);

-- Add RLS policies
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;

-- Users can only see templates from their tenant
CREATE POLICY exam_templates_tenant_isolation ON exam_templates
  FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Add updated_at trigger
CREATE TRIGGER exam_templates_updated_at
  BEFORE UPDATE ON exam_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE exam_templates IS 'Templates for automatically generating recurring exams';
COMMENT ON COLUMN exam_templates.name_pattern IS 'Pattern for generating exam names, supports {year}, {month}, {week}, {date} placeholders';
COMMENT ON COLUMN exam_templates.recurrence_config IS 'JSON config for recurrence: {"day_of_week": 1, "week_interval": 1} or {"day_of_month": 15}';
