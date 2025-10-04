-- Dashboard RPC function for optimized data fetching
-- This function fetches all dashboard data in a single database call

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
begin
  today_start := today_param::timestamptz;
  today_end := (today_param + interval '1 day')::timestamptz;
  two_weeks_ago := today_param - interval '14 days';

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
    )
  ) into result;

  return result;
end;
$$;

-- Grant execute permission
grant execute on function get_dashboard_data(date) to authenticated;
