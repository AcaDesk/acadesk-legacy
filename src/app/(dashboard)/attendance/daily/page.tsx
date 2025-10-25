import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { DailyAttendanceClient } from './daily-attendance-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '일일 출석부',
  description: '오늘의 출석을 체크하고 관리합니다.',
}

export default async function DailyAttendancePage() {
  // Verify authentication
  await requireAuth()

  // TODO: Fetch today's classes and attendance
  const classes = [
    {
      id: '1',
      name: '중1 수학 A반',
      time: '14:00 - 15:30',
      instructor: '김선생',
      students: [
        {
          id: '1',
          student_code: 'S2024001',
          name: '김철수',
          grade: '중1',
          phone: '010-1234-5678',
          guardian_name: '김철수 학부모님',
          guardian_phone: '010-9999-0001',
          attendance_status: null, // present, absent, late
        },
        {
          id: '2',
          student_code: 'S2024002',
          name: '이영희',
          grade: '중1',
          phone: '010-2345-6789',
          guardian_name: '이영희 학부모님',
          guardian_phone: '010-9999-0002',
          attendance_status: null,
        },
        {
          id: '3',
          student_code: 'S2024003',
          name: '박민수',
          grade: '중1',
          phone: '010-3456-7890',
          guardian_name: '박민수 학부모님',
          guardian_phone: '010-9999-0003',
          attendance_status: null,
        },
      ],
    },
    {
      id: '2',
      name: '중2 영어 B반',
      time: '16:00 - 17:30',
      instructor: '이선생',
      students: [
        {
          id: '4',
          student_code: 'S2024004',
          name: '정지훈',
          grade: '중2',
          phone: '010-4567-8901',
          guardian_name: '정지훈 학부모님',
          guardian_phone: '010-9999-0004',
          attendance_status: null,
        },
        {
          id: '5',
          student_code: 'S2024005',
          name: '최수진',
          grade: '중2',
          phone: '010-5678-9012',
          guardian_name: '최수진 학부모님',
          guardian_phone: '010-9999-0005',
          attendance_status: null,
        },
      ],
    },
  ]

  return (
    <PageWrapper>
      <DailyAttendanceClient classes={classes} />
    </PageWrapper>
  )
}
