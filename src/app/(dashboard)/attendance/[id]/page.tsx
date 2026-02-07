import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAttendanceSessionById, getAttendanceBySession } from '@/app/actions/attendance';
import { AttendanceCheckPage } from '@/components/features/attendance/AttendanceCheckPage';

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function AttendanceSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Get session details using Server Action
  const sessionResult = await getAttendanceSessionById(id);

  if (!sessionResult.success || !sessionResult.data) {
    redirect('/attendance');
  }

  const session = sessionResult.data;
  const supabase = await createClient();

  // P2 Fix: 병렬 조회 - enrollments + attendance 동시 조회
  // class_enrollments -> students -> users를 한 번의 join 쿼리로 합침
  const [enrollmentsResult, recordsResult] = await Promise.all([
    supabase
      .from('class_enrollments')
      .select(`
        student_id,
        students!inner (
          id,
          student_code,
          users!inner (
            name
          )
        )
      `)
      .eq('class_id', session.class_id)
      .eq('status', 'active'),
    getAttendanceBySession(id),
  ]);

  if (enrollmentsResult.error) {
    console.error('Failed to fetch enrollments:', enrollmentsResult.error);
    redirect('/attendance');
  }

  // 조인된 데이터에서 학생 정보 추출
  const students = (enrollmentsResult.data || []).map((enrollment: any) => ({
    id: enrollment.students.id,
    student_code: enrollment.students.student_code,
    users: enrollment.students.users,
  }));

  const existingRecords = recordsResult.success ? recordsResult.data : [];

  return (
    <div className="container mx-auto py-8 px-4">
      <AttendanceCheckPage
        session={session}
        students={students}
        existingRecords={existingRecords}
      />
    </div>
  );
}
