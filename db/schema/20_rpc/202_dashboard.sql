-- 202_dashboard.sql
create or replace function public.get_dashboard_data(today_param date default current_date)
returns json
language sql
stable
as $$
  select json_build_object(
    'stats', json_build_object(
      'totalStudents', 0, 'activeClasses', 0, 'todayAttendance', 0,
      'pendingTodos', 0, 'totalReports', 0, 'unsentReports', 0
    ),
    'recentStudents', '[]'::json,
    'todaySessions', '[]'::json,
    'birthdayStudents', '[]'::json,
    'scheduledConsultations', '[]'::json,
    'studentAlerts', json_build_object('longAbsence','[]'::json,'pendingAssignments','[]'::json),
    'financialData', json_build_object('currentMonthRevenue',0,'previousMonthRevenue',0,'unpaidTotal',0,'unpaidCount',0),
    'classStatus','[]'::json,
    'parentsToContact','[]'::json,
    'calendarEvents','[]'::json,
    'activityLogs','[]'::json
  );
$$;

grant execute on function public.get_dashboard_data(date) to authenticated;