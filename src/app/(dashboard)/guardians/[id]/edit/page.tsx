import { notFound } from 'next/navigation'
import { getGuardianDetail, getStudentsForSelect } from '@/app/actions/guardians'
import { EditGuardianClient } from './edit-guardian-client'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface EditGuardianPageProps {
  params: Promise<{ id: string }>
}

export default async function EditGuardianPage({ params }: EditGuardianPageProps) {
  // Feature flag checks
  const featureStatus = FEATURES.guardianManagement

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="보호자 수정"
        description="보호자 정보를 수정하고 학생과의 연결을 관리할 수 있는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="보호자 수정"
        reason="보호자 관리 시스템 업데이트가 진행 중입니다."
      />
    )
  }

  const { id } = await params

  // Fetch data on server in parallel
  const [guardianResult, studentsResult] = await Promise.all([
    getGuardianDetail(id),
    getStudentsForSelect(),
  ])

  if (!guardianResult.success || !guardianResult.data) {
    notFound()
  }

  // TODO(any): Supabase nested query types need proper typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = guardianResult.data as any

  // 연결된 학생 ID + 이름 추출 (deleted_at IS NULL만)
  const linkedStudents = (raw.student_guardians || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((sg: any) => sg.deleted_at === null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((sg: any) => {
      const student = Array.isArray(sg.students) ? sg.students[0] : sg.students
      return student ? { id: student.id as string, name: (student.name as string) || '' } : null
    })
    .filter((s: { id: string; name: string } | null): s is { id: string; name: string } =>
      s !== null
    )

  const guardian = {
    id: raw.id as string,
    relationship: raw.relationship as string | null,
    occupation: raw.occupation as string | null,
    address: raw.address as string | null,
    userName: (raw.name as string) || null,
    userEmail: (raw.email as string | null) || null,
    userPhone: (raw.phone as string | null) || null,
    connectedStudentIds: linkedStudents.map((s: { id: string }) => s.id),
    linkedStudentNames: linkedStudents.map((s: { name: string }) => s.name).filter(Boolean),
  }

  return (
    <EditGuardianClient
      guardian={guardian}
      students={studentsResult.data || []}
    />
  )
}
