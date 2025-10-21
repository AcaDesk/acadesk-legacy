-- 11_fix_get_auth_stage_params.sql
-- Fix get_auth_stage function to accept p_invite_token parameter

-- Drop old function without parameters
DROP FUNCTION IF EXISTS public.get_auth_stage();

-- Create new function with p_invite_token parameter
CREATE OR REPLACE FUNCTION public.get_auth_stage(p_invite_token TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_u     public.users%ROWTYPE;
  v_token TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', 'unauthenticated');
  END IF;

  -- Try to get user record
  SELECT * INTO v_u FROM public.users WHERE id = v_uid;

  -- If user doesn't exist in users table, redirect to bootstrap
  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', TRUE,
      'stage', json_build_object(
        'code', 'NO_PROFILE',
        'next_url', '/auth/bootstrap'
      )
    );
  END IF;

  -- Use parameter token if provided, otherwise try to get from header
  v_token := p_invite_token;
  IF v_token IS NULL OR v_token = '' THEN
    v_token := current_setting('request.header.x-invite-token', TRUE);
  END IF;

  -- If invite token exists, redirect to invite acceptance flow
  IF v_token IS NOT NULL AND v_token <> '' THEN
    RETURN json_build_object(
      'ok', TRUE,
      'stage', json_build_object(
        'code', 'MEMBER_INVITED',
        'next_url', '/auth/invite/accept?token=' || v_token
      )
    );
  END IF;

  -- If user has no role and is pending approval
  IF v_u.role_code IS NULL AND v_u.approval_status = 'pending' THEN
    RETURN json_build_object(
      'ok', TRUE,
      'stage', json_build_object(
        'code', 'PENDING_OWNER_REVIEW',
        'next_url', '/auth/pending'
      )
    );
  END IF;

  -- If user is owner and onboarding not completed
  IF v_u.role_code = 'owner' AND v_u.onboarding_completed IS FALSE THEN
    RETURN json_build_object(
      'ok', TRUE,
      'stage', json_build_object(
        'code', 'OWNER_SETUP_REQUIRED',
        'next_url', '/auth/owner/setup'
      )
    );
  END IF;

  -- User is ready to access the dashboard
  RETURN json_build_object(
    'ok', TRUE,
    'stage', json_build_object('code', 'READY')
  );
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_stage(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_auth_stage(TEXT) IS
'Determines the authentication stage and next URL for routing after login.
Accepts optional invite token parameter.';
