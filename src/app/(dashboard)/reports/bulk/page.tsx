import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { BulkReportsContent } from './bulk-reports-content'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
    email: string | null
  } | null
}

interface Class {
  id: string
  name: string
}

export default async function BulkReportsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 일괄 생성" description="여러 학생의 리포트를 한 번에 생성하고 자동으로 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 일괄 생성" reason="리포트 생성 시스템 업데이트가 진행 중입니다." />;
  }

  // Verify staff access and get tenant
  const { tenantId } = await verifyStaff()
  const supabase = createServiceRoleClient()

  // Fetch classes
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .is('deleted_at', null)
    .order('name')

  // Fetch all students
  const { data: studentsData } = await supabase
    .from('students')
    .select('id, student_code, user_id!inner(name, email)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('student_code')

  // Map user_id to users for type compatibility
  const students: Student[] = (studentsData || []).map((student: any) => ({
    id: student.id,
    student_code: student.student_code,
    users: student.user_id,
  }))

  const classes: Class[] = classesData || []

  return <BulkReportsContent initialStudents={students} initialClasses={classes} />
}
