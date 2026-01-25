# Deprecated RPC Functions & Removal Plan

> **Status**: Ready for removal
> **Date**: 2025-10-23

## ✅ Replaced Auth RPC Functions (Safe to Remove)

These functions have been replaced by Server Actions using service_role:

### 1. `get_onboarding_state()`
- **Location**: `supabase/migrations/08_first_mvp.sql:282-327`
- **Replaced by**: `checkOnboardingStage()` in `src/app/actions/onboarding.ts`
- **Usage**: ❌ Not used anywhere in codebase
- **Action**: DROP FUNCTION

### 2. `create_user_profile()`
- **Location**: `supabase/migrations/08_first_mvp.sql:332-365`
- **Replaced by**: `createUserProfileServer()` in `src/app/actions/onboarding.ts`
- **Usage**: ❌ Not used (only mentioned in comments)
- **Action**: DROP FUNCTION

### 3. `check_approval_status()`
- **Location**: `supabase/migrations/08_first_mvp.sql:367-402`
- **Replaced by**: `getApprovalStatus()` in `src/lib/auth/service-role-helpers.ts`
- **Usage**: ❌ Not used anywhere in codebase
- **Action**: DROP FUNCTION

### 4. `complete_owner_onboarding()`
- **Location**: `supabase/migrations/08_first_mvp.sql:404-470`
- **Replaced by**: `completeOwnerOnboarding()` in `src/app/actions/onboarding.ts`
- **Usage**: ❌ Not used (only mentioned in comments)
- **Action**: DROP FUNCTION

### 5. `finish_owner_academy_setup()`
- **Location**: `supabase/migrations/08_first_mvp.sql:472-519`
- **Replaced by**: Integrated into `completeOwnerOnboarding()` Server Action
- **Usage**: ❌ Not used (only mentioned in comments)
- **Action**: DROP FUNCTION

### 6. `get_auth_stage()`
- **Location**: `supabase/migrations/11_fix_get_auth_stage_params.sql:8-85`
- **Replaced by**: `checkOnboardingStage()` in `src/app/actions/onboarding.ts`
- **Usage**: ❌ Not used (only mentioned in comments)
- **Action**: DROP FUNCTION

### 7. `get_dashboard_data()`
- **Location**: `supabase/migrations/08_first_mvp.sql:575-598`
- **Replaced by**: Individual Server Actions per widget
- **Usage**: ❌ Stub function, never implemented
- **Action**: DROP FUNCTION

## ⏸️ Functions to Keep (Still in Use)

### 1. `get_student_todos_for_kiosk()`
- **Location**: `supabase/migrations/08_first_mvp.sql:521-572`
- **Usage**: ✅ Used for kiosk (anon access with PIN verification)
- **Action**: KEEP (security definer for anon users)

### 2. Helper Functions
- `primary_email()` - Used internally, may be needed
- `slugify()`, `gen_unique_slug()` - Utility functions, keep
- `update_updated_at_column()` - Trigger function, keep

### 3. RLS Helper Functions (To Be Removed Later)
- `current_user_tenant_id()` - Used by RLS policies
- `current_user_role()` - Used by RLS policies

**Note**: These will be removed when RLS is fully disabled.

## 🗑️ SQL Removal Script

**Option 1: Manual execution in Supabase SQL Editor**

```sql
-- Remove deprecated auth RPC functions
DROP FUNCTION IF EXISTS public.get_onboarding_state();
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.check_approval_status();
DROP FUNCTION IF EXISTS public.complete_owner_onboarding(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.finish_owner_academy_setup(text, text, jsonb);
DROP FUNCTION IF EXISTS public.get_auth_stage(text);
DROP FUNCTION IF EXISTS public.get_dashboard_data(date);

-- Revoke grants (if any)
REVOKE EXECUTE ON FUNCTION public.get_onboarding_state() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_profile() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.check_approval_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_owner_onboarding(uuid, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_owner_academy_setup(text, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_auth_stage(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_data(date) FROM authenticated;
```

**Option 2: Migration file (if using Supabase CLI)**

Create: `supabase/migrations/YYYYMMDDNNNNNN_remove_deprecated_auth_rpcs.sql`

## 📝 Code Cleanup Tasks

### 1. Remove outdated comments mentioning RPC functions
- [ ] `src/app/actions/onboarding.ts` - Lines with RPC references
- [ ] `src/app/(auth)/auth/owner/setup/page.tsx` - RPC comment
- [ ] `src/app/(dashboard)/layout.tsx` - get_auth_stage comment

### 2. Update documentation
- [ ] Update CLAUDE.md if it references RPC functions
- [ ] Update any API documentation

## ⚠️ Before Removal Checklist

- [x] Verify all auth flows work with Server Actions
- [x] Test onboarding flow end-to-end
- [x] Verify no client code calls these RPCs
- [ ] Run tests to ensure nothing breaks
- [ ] Backup database before executing DROP commands
- [ ] Execute in staging first, then production

## 🔄 Rollback Plan

If issues arise after removal:

1. Restore from migration file `08_first_mvp.sql` and `11_fix_get_auth_stage_params.sql`
2. Re-create functions:
   ```bash
   psql -f supabase/migrations/08_first_mvp.sql
   psql -f supabase/migrations/11_fix_get_auth_stage_params.sql
   ```

## ✅ Post-Removal Verification

- [ ] Sign up flow works
- [ ] Login flow works
- [ ] Owner onboarding works
- [ ] Email verification works
- [ ] Role-based access control works
- [ ] No errors in logs
