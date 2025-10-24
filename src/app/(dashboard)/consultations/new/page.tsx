import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { ConsultationFormClient } from './consultation-form-client'

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
      mode="create"
    />
  )
}
