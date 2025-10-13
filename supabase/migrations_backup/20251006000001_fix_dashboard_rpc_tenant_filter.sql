-- Fix dashboard RPC to include tenant_id filtering
-- This ensures data isolation between tenants

drop function if exists get_dashboard_data(date);

create or replace function get_dashboard_data(today_param date)
returns json
language plpgsql
security definer
as $$
declare
  result json;
  today_start timestamptz;
  today_end timestamptz;
  two_weeks_ago date;
  current_tenant_id uuid;
begin
  -- Get current tenant_id
  current_tenant_id := get_current_tenant_id();

  today_start := today_param::timestamptz;
  today_end := (today_param + interval '1 day')::timestamptz;
  two_weeks_ago := today_param - interval '14 days';

  select json_build_object(
    'stats', json_build_object(
      'totalStudents', (
        select count(*)
        from students
        where tenant_id = current_tenant_id
          and deleted_at is null
      ),
      'activeClasses', (
        select count(*)
        from classes
        where tenant_id = current_tenant_id
          and deleted_at is null
      ),
      'todayAttendance', (
        select count(*)
        from attendance
        where tenant_id = current_tenant_id
          and check_in_at >= today_start
          and check_in_at < today_end
      ),
      'pendingTodos', (
        select count(*)
        from student_todos
        where tenant_id = current_tenant_id
          and completed_at is null
      ),
      'totalReports', (
        select count(*)
        from reports
        where tenant_id = current_tenant_id
      ),
      'unsentReports', (
        select count(*)
        from reports
        where tenant_id = current_tenant_id
          and sent_at is null
      )
    ),
    'recentStudents', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          s.id,
          s.student_code,
          json_build_object('name', u.name) as users
        from students s
        left join users u on s.user_id = u.id
        where s.tenant_id = current_tenant_id
          and s.deleted_at is null
        order by s.created_at desc
        limit 5
      ) t
    ),
    'todaySessions', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          ats.id,
          ats.session_date,
          ats.scheduled_start_at,
          ats.scheduled_end_at,
          ats.status,
          json_build_object('name', c.name) as classes
        from attendance_sessions ats
        left join classes c on ats.class_id = c.id
        where ats.tenant_id = current_tenant_id
          and ats.session_date = today_param
        order by ats.scheduled_start_at
      ) t
    ),
    'birthdayStudents', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          s.id,
          json_build_object('name', u.name, 'birth_date', s.birth_date) as users
        from students s
        left join users u on s.user_id = u.id
        where s.tenant_id = current_tenant_id
          and s.deleted_at is null
          and s.birth_date is not null
          and to_char(s.birth_date, 'MM-DD') = to_char(today_param, 'MM-DD')
      ) t
    ),
    'scheduledConsultations', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          cons.id,
          cons.scheduled_at,
          json_build_object(
            'users', json_build_object('name', u.name)
          ) as students
        from consultations cons
        left join students s on cons.student_id = s.id
        left join users u on s.user_id = u.id
        where cons.tenant_id = current_tenant_id
          and cons.scheduled_at >= today_start
          and cons.scheduled_at < today_end
        order by cons.scheduled_at
      ) t
    ),
    'studentAlerts', json_build_object(
      'longAbsence', (
        select coalesce(json_agg(row_to_json(t)), '[]'::json)
        from (
          select
            s.id,
            s.student_code,
            json_build_object('name', u.name) as users,
            coalesce(
              (
                select count(*)::float / nullif(count(distinct ats.session_date), 0) * 100
                from attendance_sessions ats
                left join attendance a on a.session_id = ats.id and a.student_id = s.id
                where ats.tenant_id = current_tenant_id
                  and ats.session_date >= two_weeks_ago
                  and ats.session_date <= today_param
                  and a.id is not null
              ), 0
            ) as attendance_rate
          from students s
          left join users u on s.user_id = u.id
          where s.tenant_id = current_tenant_id
            and s.deleted_at is null
          having coalesce(
            (
              select count(*)::float / nullif(count(distinct ats.session_date), 0) * 100
              from attendance_sessions ats
              left join attendance a on a.session_id = ats.id and a.student_id = s.id
              where ats.tenant_id = current_tenant_id
                and ats.session_date >= two_weeks_ago
                and ats.session_date <= today_param
                and a.id is not null
            ), 0
          ) < 50
          limit 10
        ) t
      ),
      'pendingAssignments', (
        select coalesce(json_agg(row_to_json(t)), '[]'::json)
        from (
          select
            s.id,
            s.student_code,
            json_build_object('name', u.name) as users,
            (
              select count(*)
              from student_todos st
              where st.tenant_id = current_tenant_id
                and st.student_id = s.id
                and st.completed_at is null
            ) as pending_count
          from students s
          left join users u on s.user_id = u.id
          where s.tenant_id = current_tenant_id
            and s.deleted_at is null
          having (
            select count(*)
            from student_todos st
            where st.tenant_id = current_tenant_id
              and st.student_id = s.id
              and st.completed_at is null
          ) >= 3
          order by pending_count desc
          limit 10
        ) t
      )
    ),
    'financialData', json_build_object(
      'currentMonthRevenue', coalesce((
        select sum(amount_paid)
        from payments
        where tenant_id = current_tenant_id
          and date_trunc('month', payment_date) = date_trunc('month', today_param::timestamptz)
      ), 0),
      'previousMonthRevenue', coalesce((
        select sum(amount_paid)
        from payments
        where tenant_id = current_tenant_id
          and date_trunc('month', payment_date) = date_trunc('month', today_param::timestamptz - interval '1 month')
      ), 0),
      'unpaidTotal', coalesce((
        select sum(tuition_fee - amount_paid)
        from tuition_invoices
        where tenant_id = current_tenant_id
          and status != 'paid'
      ), 0),
      'unpaidCount', coalesce((
        select count(*)
        from tuition_invoices
        where tenant_id = current_tenant_id
          and status != 'paid'
      ), 0)
    ),
    'classStatus', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          c.id,
          c.name,
          c.capacity,
          (
            select count(*)
            from class_enrollments ce
            where ce.class_id = c.id
              and ce.status = 'active'
          ) as enrolled_count
        from classes c
        where c.tenant_id = current_tenant_id
          and c.deleted_at is null
        order by c.name
      ) t
    ),
    'parentsToContact', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select distinct
          s.id,
          s.student_code,
          json_build_object('name', u.name) as users
        from students s
        left join users u on s.user_id = u.id
        where s.tenant_id = current_tenant_id
          and s.deleted_at is null
          and (
            -- Students with pending assignments
            exists (
              select 1 from student_todos st
              where st.tenant_id = current_tenant_id
                and st.student_id = s.id
                and st.completed_at is null
                and st.due_date < today_param
            )
            or
            -- Students with low attendance
            exists (
              select 1
              from attendance_sessions ats
              left join attendance a on a.session_id = ats.id and a.student_id = s.id
              where ats.tenant_id = current_tenant_id
                and ats.session_date >= two_weeks_ago
                and a.id is null
              having count(*) >= 3
            )
          )
        limit 10
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- Grant execute permission
grant execute on function get_dashboard_data(date) to authenticated;
