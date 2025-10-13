-- Sync existing auth users to public.users
-- Note: This will only work if auth.users already has data at migration time
-- For local development, users need to login after db reset to trigger the sync
INSERT INTO public.users (id, tenant_id, email, name, role_code)
SELECT
  au.id,
  'a0000000-0000-0000-0000-000000000001'::uuid AS tenant_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) AS name,
  'admin' AS role_code
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Create trigger function to auto-sync new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, tenant_id, email, name, role_code)
  VALUES (
    NEW.id,
    'a0000000-0000-0000-0000-000000000001',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
