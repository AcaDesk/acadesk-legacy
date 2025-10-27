-- RLS Policies for message_templates

-- Staff can view their tenant's templates
CREATE POLICY "Staff can view their tenant's message templates"
  ON public.message_templates
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND deleted_at IS NULL
  );

-- Staff can create templates for their tenant
CREATE POLICY "Staff can create message templates"
  ON public.message_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Staff can update their tenant's templates
CREATE POLICY "Staff can update their tenant's message templates"
  ON public.message_templates
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Staff can soft delete their tenant's templates
CREATE POLICY "Staff can delete their tenant's message templates"
  ON public.message_templates
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );
