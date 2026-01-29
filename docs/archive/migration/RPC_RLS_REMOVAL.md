# RPC/RLS Removal and Server-Side Migration

This change removes client-side RPC and RLS dependency by moving all data access to server-side handlers using Supabase `service_role`.

## What Changed

- Added `GET /api/students/[studentId]/points` to fetch point balance/history on the server using `service_role`.
- Refactored `StudentPointsWidget` to call the API instead of `supabase.rpc` from the client.
- Added `GET /api/auth/tenant` to resolve current user's `tenantId` server-side.
- Refactored `GuardianList` to use the new endpoint instead of client-side `users` query.
- Made `SUPABASE_SERVICE_ROLE_KEY` required and updated `.env.example` accordingly.

## Next Targets (High Priority)

- Replace all remaining client-side `createClient().from(...)` calls with Server Actions or API Routes.
- Phase out remaining `.rpc(...)` calls server-side by re-implementing logic with table queries and transactions.
- Add SQL migrations to disable RLS on all application tables or rely solely on `service_role` (if RLS disabled) with explicit server-side authorization checks.

## Notes

- `service_role` bypasses RLS. Always verify authentication and tenant/role on server before performing queries.
- Keep `service_role` usage in Server Actions, Route Handlers, or Server Components only.

## Env

Required variables:

```
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_SUPABASE_URL=<project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

