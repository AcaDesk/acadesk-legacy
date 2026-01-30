import { notFound } from 'next/navigation'
import { getGuardianDetail } from '@/app/actions/guardians'
import { GuardianDetailClient } from './guardian-detail-client'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface GuardianDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function GuardianDetailPage({ params }: GuardianDetailPageProps) {
  // Feature flag checks
  const featureStatus = FEATURES.guardianManagement

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

  // Fetch data on server
  const result = await getGuardianDetail(id)

  // Handle not found
  if (!result.success || !result.data) {
    notFound()
  }

  // Type-safe transformation
  // TODO(any): Supabase nested query types need proper typing
  const rawUsers = result.data.users as any
  const usersData = Array.isArray(rawUsers) ? rawUsers[0] : rawUsers

  const guardian = {
    id: result.data.id,
    relationship: result.data.relationship,
    occupation: result.data.occupation,
    address: result.data.address,
    users: usersData
      ? {
          name: usersData.name as string,
          email: usersData.email as string | null,
          phone: usersData.phone as string | null,
        }
      : null,
    student_guardians: ((result.data.student_guardians || []) as any[]).map((sg) => ({
      is_primary: sg.is_primary || false,
      students: sg.students
        ? {
            id: sg.students.id,
            student_code: sg.students.student_code,
            grade: sg.students.grade,
            users: sg.students.users
              ? { name: Array.isArray(sg.students.users) ? sg.students.users[0]?.name : sg.students.users.name }
              : null,
          }
        : null,
    })),
  }

  return <GuardianDetailClient guardian={guardian} />
}
