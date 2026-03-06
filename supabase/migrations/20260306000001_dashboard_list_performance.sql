-- Migration: Dashboard and list performance improvements
-- Description:
--   1. Add tenant-oriented partial indexes for report/list/dashboard queries
--   2. Move dashboard KPI aggregation into SQL to avoid large row scans in JS

create index if not exists idx_attendance_tenant_student_date
  on public.attendance (tenant_id, student_id, attendance_date desc)
  where deleted_at is null;

create index if not exists idx_attendance_tenant_date_status
  on public.attendance (tenant_id, attendance_date, status)
  where deleted_at is null;

create index if not exists idx_exam_scores_tenant_student_exam
  on public.exam_scores (tenant_id, student_id, exam_id)
  where deleted_at is null;

create index if not exists idx_student_todos_tenant_pending_active
  on public.student_todos (tenant_id, due_date)
  where deleted_at is null
    and completed_at is null
    and verified_at is null;

create index if not exists idx_consultations_tenant_conducted_by_date
  on public.consultations (tenant_id, conducted_by, consultation_date desc)
  where deleted_at is null;

create index if not exists idx_consultations_tenant_follow_up_date
  on public.consultations (tenant_id, follow_up_required, consultation_date desc)
  where deleted_at is null;

create or replace function public.get_dashboard_stats(
  p_tenant_id uuid,
  p_today date
)
returns table (
  total_students bigint,
  active_classes bigint,
  today_attendance bigint,
  pending_todos bigint,
  average_score numeric,
  completion_rate numeric,
  previous_month_students bigint,
  previous_week_attendance bigint,
  previous_month_avg_score numeric,
  previous_week_completion_rate numeric,
  lead_consultations bigint,
  converted_consultations bigint
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select
      p_today::date as today,
      date_trunc('month', p_today::timestamp)::date as current_month_start,
      date_trunc('month', (p_today::timestamp - interval '1 month'))::date as last_month_start,
      (p_today::date - interval '7 days')::date as last_week_start,
      (p_today::timestamp - interval '30 days') as rolling_30_start
  ),
  student_counts as (
    select
      count(*) filter (where deleted_at is null) as total_students,
      count(*) filter (
        where deleted_at is null
          and created_at < (select current_month_start from bounds)
      ) as previous_month_students
    from public.students
    where tenant_id = p_tenant_id
  ),
  class_counts as (
    select count(*) as active_classes
    from public.classes
    where tenant_id = p_tenant_id
      and status = 'active'
  ),
  attendance_counts as (
    select
      count(*) filter (
        where deleted_at is null
          and attendance_date = (select today from bounds)
          and status = 'present'
      ) as today_attendance,
      count(*) filter (
        where deleted_at is null
          and attendance_date >= (select last_week_start from bounds)
          and attendance_date < (select today from bounds)
          and status = 'present'
      ) as previous_week_attendance
    from public.attendance
    where tenant_id = p_tenant_id
  ),
  todo_counts as (
    select
      count(*) filter (
        where deleted_at is null
          and completed_at is null
          and verified_at is null
      ) as pending_todos,
      count(*) filter (where deleted_at is null) as total_todos,
      count(*) filter (
        where deleted_at is null
          and completed_at is not null
      ) as completed_todos,
      count(*) filter (
        where deleted_at is null
          and (created_at at time zone 'Asia/Seoul') >= (select last_week_start::timestamp from bounds)
          and (created_at at time zone 'Asia/Seoul') < (select today::timestamp from bounds)
      ) as previous_week_total_todos,
      count(*) filter (
        where deleted_at is null
          and completed_at is not null
          and (created_at at time zone 'Asia/Seoul') >= (select last_week_start::timestamp from bounds)
          and (created_at at time zone 'Asia/Seoul') < (select today::timestamp from bounds)
      ) as previous_week_completed_todos
    from public.student_todos
    where tenant_id = p_tenant_id
  ),
  score_counts as (
    select
      avg(percentage) filter (
        where deleted_at is null
          and percentage is not null
          and (created_at at time zone 'Asia/Seoul') >= (select rolling_30_start from bounds)
          and (created_at at time zone 'Asia/Seoul') < ((select today from bounds)::timestamp + interval '1 day')
      ) as average_score,
      avg(percentage) filter (
        where deleted_at is null
          and percentage is not null
          and (created_at at time zone 'Asia/Seoul') >= (select last_month_start::timestamp from bounds)
          and (created_at at time zone 'Asia/Seoul') < (select current_month_start::timestamp from bounds)
      ) as previous_month_avg_score
    from public.exam_scores
    where tenant_id = p_tenant_id
  ),
  consultation_counts as (
    select
      count(*) filter (
        where deleted_at is null
          and is_lead = true
          and converted_to_student_id is null
      ) as lead_consultations,
      count(*) filter (
        where deleted_at is null
          and is_lead = true
          and converted_to_student_id is not null
      ) as converted_consultations
    from public.consultations
    where tenant_id = p_tenant_id
  )
  select
    sc.total_students,
    cc.active_classes,
    ac.today_attendance,
    tc.pending_todos,
    coalesce(round(score.average_score, 1), 0),
    case
      when tc.total_todos > 0
        then round((tc.completed_todos::numeric / tc.total_todos::numeric) * 100, 0)
      else 0
    end as completion_rate,
    sc.previous_month_students,
    ac.previous_week_attendance,
    coalesce(round(score.previous_month_avg_score, 1), 0),
    case
      when tc.previous_week_total_todos > 0
        then round((tc.previous_week_completed_todos::numeric / tc.previous_week_total_todos::numeric) * 100, 0)
      else 0
    end as previous_week_completion_rate,
    consult.lead_consultations,
    consult.converted_consultations
  from student_counts sc
  cross join class_counts cc
  cross join attendance_counts ac
  cross join todo_counts tc
  cross join score_counts score
  cross join consultation_counts consult;
$$;

grant execute on function public.get_dashboard_stats(uuid, date) to authenticated;
grant execute on function public.get_dashboard_stats(uuid, date) to service_role;
