import { notFound } from 'next/navigation'
import { getGuardianDetail, getStudentsForSelect } from '@/app/actions/guardians'
import { GuardianDetailClient } from './guardian-detail-client'
import { getEffectiveFeatureStatusForCurrentTenant } from '@/lib/feature-flags-server'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface GuardianDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function GuardianDetailPage({ params }: GuardianDetailPageProps) {
  // Feature flag checks
  const featureStatus = await getEffectiveFeatureStatusForCurrentTenant('guardianManagement')

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="보호자 상세"
        description="보호자 정보와 연결된 학생 목록을 확인하고 관리할 수 있는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="보호자 상세"
        reason="보호자 관리 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  const { id } = await params

  const [result, studentsResult] = await Promise.all([
    getGuardianDetail(id),
    getStudentsForSelect(),
  ])

  if (!result.success || !result.data) {
    notFound()
  }

  // TODO(any): Supabase nested query types need proper typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = result.data as any

  const guardian = {
    id: raw.id as string,
    name: (raw.name as string) || null,
    phone: (raw.phone as string | null) || null,
    email: (raw.email as string | null) || null,
    relationship: (raw.relationship as string | null) || null,
    occupation: (raw.occupation as string | null) || null,
    address: (raw.address as string | null) || null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    student_guardians: ((raw.student_guardians || []) as any[])
      .filter((sg) => sg.deleted_at === null)
      .map((sg) => {
        const student = Array.isArray(sg.students) ? sg.students[0] : sg.students
        return {
          is_primary: Boolean(sg.is_primary),
          is_primary_contact: Boolean(sg.is_primary_contact),
          receives_notifications: Boolean(sg.receives_notifications),
          receives_billing: Boolean(sg.receives_billing),
          can_pickup: Boolean(sg.can_pickup),
          can_view_reports: Boolean(sg.can_view_reports),
          students: student
            ? {
                id: student.id as string,
                name: (student.name as string) || '',
                student_code: (student.student_code as string) || '',
                grade: (student.grade as string | null) || null,
              }
            : null,
        }
      }),
  }

  return (
    <GuardianDetailClient
      guardian={guardian}
      availableStudents={studentsResult.data || []}
    />
  )
}
