-- Create helper functions for tenant isolation

-- Function to get current tenant_id from authenticated user
create or replace function get_current_tenant_id()
returns uuid
language sql
stable
security definer
as $$
  select tenant_id
  from users
  where id = auth.uid()
  limit 1;
$$;

-- Grant execute permission
grant execute on function get_current_tenant_id() to authenticated;

-- Function to get current user role
create or replace function get_current_user_role()
returns text
language sql
stable
security definer
as $$
  select role_code
  from users
  where id = auth.uid()
  limit 1;
$$;

-- Grant execute permission
grant execute on function get_current_user_role() to authenticated;
