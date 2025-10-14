-- ============================================================
-- 01) Extensions
-- ------------------------------------------------------------
-- Purpose: Enable all required PostgreSQL extensions
-- Order: Must be executed FIRST before any schema creation
-- ============================================================

-- UUID generation support (used for primary keys)
create extension if not exists "uuid-ossp";

-- Cryptographic functions (used for PIN hash, token generation)
create extension if not exists pgcrypto;

-- Trigram index support (used for fuzzy search on names)
create extension if not exists pg_trgm;

-- Comment:
-- - uuid-ossp: provides gen_random_uuid() for default UUID PKs
-- - pgcrypto: provides crypt(), gen_salt(), encode(gen_random_bytes())
-- - pg_trgm: enables GIN trigram indexes for text search (student names, etc.)

-- Optional: ensure extension schema is public
alter extension "uuid-ossp" set schema public;
alter extension pgcrypto set schema public;
alter extension pg_trgm set schema public;

-- Verification step (optional)
-- select extname, extversion, schema_name from pg_extension e join pg_namespace n on e.extnamespace = n.oid;