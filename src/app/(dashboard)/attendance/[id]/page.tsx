import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AttendanceRepository } from '@/services/data/attendance.repository';
import { AttendanceCheckPage } from '@/components/features/attendance/AttendanceCheckPage';

export default async function AttendanceSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's tenant
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (userError || !userData?.tenant_id) {
    console.error('Failed to fetch user data:', userError);
    redirect('/auth/login');
  }

  // Get session details
  const session = await AttendanceRepository.getSessionById(id);

  if (!session) {
    redirect('/attendance');
  }

  // Get students enrolled in this class
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('class_enrollments')
    .select('student_id')
    .eq('class_id', session.class_id)
    .eq('status', 'active');

  if (enrollmentError) {
    console.error('Failed to fetch enrollments:', enrollmentError);
    redirect('/attendance');
  }

  const studentIds = enrollments?.map((e) => e.student_id) || [];

  let students: Array<{
    id: string
    student_code: string
    users: {
      name: string
    } | null
  }> = [];

  if (studentIds.length > 0) {
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        users (
          name
        )
      `)
      .in('id', studentIds);

    if (studentsError) {
      console.error('Failed to fetch students:', studentsError);
      redirect('/attendance');
    }

    students = (studentsData as unknown as Array<{
      id: string
      student_code: string
      users: {
        name: string
      } | null
    }>) || [];
  }

  // Get existing attendance records for this session
  const existingRecords = await AttendanceRepository.getAttendanceBySession(id);

  return (
    <div className="container mx-auto py-8 px-4">
      <AttendanceCheckPage
        session={session}
        students={students}
        existingRecords={existingRecords}
        tenantId={userData.tenant_id}
      />
    </div>
  );
}
