-- 046_message_templates.sql
-- Message Templates for SMS/Email communication

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('sms', 'email')),
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_templates_tenant_id ON public.message_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_deleted_at ON public.message_templates(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER set_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
