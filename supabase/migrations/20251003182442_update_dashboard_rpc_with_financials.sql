-- Update Dashboard RPC function to include financial and class data
-- This migration adds financial snapshot, class status, and parent contact data

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
  current_month_start date;
  current_month_end date;
  previous_month_start date;
  previous_month_end date;
begin
  today_start := today_param::timestamptz;
  today_end := (today_param + interval '1 day')::timestamptz;
  two_weeks_ago := today_param - interval '14 days';

  -- Calculate month boundaries for financial data
  current_month_start := date_trunc('month', today_param)::date;
  current_month_end := (date_trunc('month', today_param) + interval '1 month' - interval '1 day')::date;
  previous_month_start := (date_trunc('month', today_param) - interval '1 month')::date;
  previous_month_end := (date_trunc('month', today_param) - interval '1 day')::date;

  select json_build_object(
    'stats', json_build_object(
      'totalStudents', (
        select count(*)
        from students
        where deleted_at is null
      ),
      'activeClasses', (
        select count(*)
        from classes
        where deleted_at is null
      ),
      'todayAttendance', (
        select count(*)
        from attendance
        where check_in_time >= today_start
          and check_in_time < today_end
      ),
      'pendingTodos', (
        select count(*)
        from student_todos
        where completed_at is null
      ),
      'totalReports', (
        select count(*)
        from reports
      ),
      'unsentReports', (
        select count(*)
        from reports
        where sent_at is null
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
        where s.deleted_at is null
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
        where ats.session_date = today_param
        order by ats.scheduled_start_at
      ) t
    ),
    'birthdayStudents', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          s.id,
          json_build_object('name', u.name, 'birth_date', u.birth_date) as users
        from students s
        left join users u on s.user_id = u.id
        where s.deleted_at is null
          and u.birth_date is not null
          and to_char(u.birth_date, 'MM-DD') = to_char(today_param, 'MM-DD')
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
        where cons.scheduled_at >= today_start
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
                where ats.session_date >= two_weeks_ago
                  and ats.session_date <= today_param
                  and a.id is not null
              ), 0
            ) as attendance_rate
          from students s
          left join users u on s.user_id = u.id
          where s.deleted_at is null
          having coalesce(
            (
              select count(*)::float / nullif(count(distinct ats.session_date), 0) * 100
              from attendance_sessions ats
              left join attendance a on a.session_id = ats.id and a.student_id = s.id
              where ats.session_date >= two_weeks_ago
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
              where st.student_id = s.id
                and st.completed_at is null
            ) as pending_count
          from students s
          left join users u on s.user_id = u.id
          where s.deleted_at is null
          having (
            select count(*)
            from student_todos st
            where st.student_id = s.id
              and st.completed_at is null
          ) >= 3
          order by pending_count desc
          limit 10
        ) t
      )
    ),
    'financialData', json_build_object(
      'currentMonthRevenue', (
        select coalesce(sum(amount), 0)
        from payments
        where payment_date >= current_month_start
          and payment_date <= current_month_end
          and status = 'completed'
      ),
      'previousMonthRevenue', (
        select coalesce(sum(amount), 0)
        from payments
        where payment_date >= previous_month_start
          and payment_date <= previous_month_end
          and status = 'completed'
      ),
      'unpaidTotal', (
        select coalesce(sum(amount), 0)
        from payments
        where status = 'pending'
          and due_date < today_param
      ),
      'unpaidCount', (
        select count(distinct student_id)
        from payments
        where status = 'pending'
          and due_date < today_param
      )
    ),
    'classStatus', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        select
          c.id,
          c.name,
          c.max_capacity,
          (
            select count(*)
            from class_enrollments ce
            where ce.class_id = c.id
              and ce.status = 'active'
              and ce.deleted_at is null
          ) as current_enrollment,
          case
            when (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) >= 100 then 'full'
            when (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) >= 80 then 'near_full'
            when (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) < 50 then 'under_enrolled'
            else 'normal'
          end as status
        from classes c
        where c.deleted_at is null
          and (
            -- Only show classes that need attention
            (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) >= 80 -- near_full or full
            or (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) < 50 -- under_enrolled
          )
        order by
          case
            when (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) >= 100 then 1
            when (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) >= 80 then 2
            when (
              select count(*)::float / nullif(c.max_capacity, 0) * 100
              from class_enrollments ce
              where ce.class_id = c.id
                and ce.status = 'active'
                and ce.deleted_at is null
            ) < 50 then 3
            else 4
          end
        limit 10
      ) t
    ),
    'parentsToContact', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json)
      from (
        -- Generate parent contact alerts based on student conditions
        select
          gen_random_uuid()::text as id,
          s.id as student_id,
          u.name as student_name,
          case
            when (
              select count(*)::float / nullif(count(distinct ats.session_date), 0) * 100
              from attendance_sessions ats
              left join attendance a on a.session_id = ats.id and a.student_id = s.id
              where ats.session_date >= two_weeks_ago
                and ats.session_date <= today_param
                and a.id is not null
            ) < 50 then '장기 결석 - 상담 필요'
            when (
              select count(*)
              from student_todos st
              where st.student_id = s.id
                and st.completed_at is null
            ) >= 3 then '과제 부진 - 학습 상담 필요'
            when (
              select count(*)
              from payments p
              where p.student_id = s.id
                and p.status = 'pending'
                and p.due_date < today_param
            ) > 0 then '미납금 확인 필요'
          end as reason,
          case
            when (
              select count(*)
              from payments p
              where p.student_id = s.id
                and p.status = 'pending'
                and p.due_date < today_param - interval '30 days'
            ) > 0 then 'high'
            when (
              select count(*)::float / nullif(count(distinct ats.session_date), 0) * 100
              from attendance_sessions ats
              left join attendance a on a.session_id = ats.id and a.student_id = s.id
              where ats.session_date >= two_weeks_ago
                and ats.session_date <= today_param
                and a.id is not null
            ) < 30 then 'high'
            when (
              select count(*)
              from student_todos st
              where st.student_id = s.id
                and st.completed_at is null
            ) >= 5 then 'high'
            else 'medium'
          end as priority
        from students s
        left join users u on s.user_id = u.id
        where s.deleted_at is null
          and (
            -- Long absence
            (
              select count(*)::float / nullif(count(distinct ats.session_date), 0) * 100
              from attendance_sessions ats
              left join attendance a on a.session_id = ats.id and a.student_id = s.id
              where ats.session_date >= two_weeks_ago
                and ats.session_date <= today_param
                and a.id is not null
            ) < 50
            or
            -- Many pending assignments
            (
              select count(*)
              from student_todos st
              where st.student_id = s.id
                and st.completed_at is null
            ) >= 3
            or
            -- Unpaid bills
            (
              select count(*)
              from payments p
              where p.student_id = s.id
                and p.status = 'pending'
                and p.due_date < today_param
            ) > 0
          )
        order by
          case priority
            when 'high' then 1
            when 'medium' then 2
            else 3
          end,
          u.name
        limit 10
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- Grant execute permission
grant execute on function get_dashboard_data(date) to authenticated;
