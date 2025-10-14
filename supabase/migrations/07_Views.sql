-- ============================================================
-- 07) Views
-- ------------------------------------------------------------
-- Purpose: Read-optimized projections for UI/API
-- Prerequisites: 01_extensions.sql ~ 06_rpcs.sql
-- Notes:
--  - Views rely on RLS of base tables (no data leakage).
--  - Keep logic deterministic and index-friendly (avoid heavy functions).
-- ============================================================


-- ============================================================
-- 1) Subject Statistics
--    - Usage counts across classes and todos per subject
--    - Compatible with both legacy classes.subject(text) and classes.subject_id
-- ============================================================

drop view if exists public.subject_statistics cascade;

create or replace view public.subject_statistics as
select
  s.tenant_id,
  s.id          as subject_id,
  s.code        as subject_code,
  s.name        as subject_name,
  s.sort_order,
  s.active,
  coalesce((
    select count(*) from public.student_todos t
    where t.tenant_id = s.tenant_id
      and (t.subject = s.code or t.subject = s.name)
  ), 0)          as todo_usage_count,
  coalesce((
    select count(*) from public.classes c
    where c.tenant_id = s.tenant_id
      and (c.subject_id = s.id or c.subject = s.code or c.subject = s.name)
  ), 0)          as class_usage_count
from public.subjects s
where s.deleted_at is null;


-- ============================================================
-- 2) Student Profiles
--    - Denormalized student header info for detail page / lists
--    - Includes primary guardian info and quick aggregates
-- ============================================================

drop view if exists public.student_profiles cascade;

create or replace view public.student_profiles as
with primary_guardian as (
  select
    sg.student_id,
    g.id                                 as guardian_id,
    ug.name                              as guardian_name,
    ug.email                             as guardian_email,
    ug.phone                             as guardian_phone,
    sg.is_primary,
    row_number() over (
      partition by sg.student_id
      order by sg.is_primary desc, sg.created_at asc
    ) as rn
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  left join public.users ug on ug.id = g.user_id
)
select
  s.id                               as student_id,
  s.tenant_id,
  s.user_id,
  s.student_code,
  u.name                             as student_name,
  u.email                            as student_email,
  u.phone                            as student_phone_user,
  s.student_phone                    as student_phone_direct,
  s.grade,
  s.school,
  s.birth_date,
  s.enrollment_date,
  s.gender,
  s.emergency_contact,
  s.commute_method,
  s.marketing_source,
  s.profile_image_url,
  s.notes,
  s.deleted_at,

  pg.guardian_id                     as primary_guardian_id,
  pg.guardian_name                   as primary_guardian_name,
  pg.guardian_email                  as primary_guardian_email,
  pg.guardian_phone                  as primary_guardian_phone,

  -- Active class count (status=active and not ended)
  coalesce((
    select count(*) from public.class_enrollments e
    where e.student_id = s.id
      and e.tenant_id = s.tenant_id
      and e.status = 'active'
      and (e.end_date is null or e.end_date >= current_date)
  ), 0)                               as active_class_count,

  -- Incomplete todo count
  coalesce((
    select count(*) from public.student_todos t
    where t.student_id = s.id
      and t.tenant_id = s.tenant_id
      and t.completed_at is null
  ), 0)                               as pending_todo_count

from public.students s
left join public.users u
  on u.id = s.user_id
left join primary_guardian pg
  on pg.student_id = s.id and pg.rn = 1;