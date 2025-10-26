import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { ConsultationFormClient } from './consultation-form-client'

// Common schools list for lead consultations
const SCHOOLS = [
  '서울고등학교',
  '경기고등학교',
  '대원외국어고등학교',
  '한영외국어고등학교',
  '민족사관고등학교',
  '상산고등학교',
  '하나고등학교',
  '기타',
]

export default async function NewConsultationPage() {
  const { tenantId } = await verifyStaff()
  const supabase = await createServiceRoleClient()

  // Fetch students list for the dropdown
  const { data: students } = await supabase
    .from('students')
    .select('id, name, grade')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name')

  return (
    <ConsultationFormClient
      students={students || []}
      schools={SCHOOLS}
      mode="create"
    />
  )
}
