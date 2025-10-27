import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { getConsultationById } from '@/app/actions/consultations'
import { ConsultationFormClient } from '../../new/consultation-form-client'

export default async function EditConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { tenantId } = await verifyStaff()

  // Fetch consultation data
  const result = await getConsultationById(id, false)

  if (!result.success || !result.data) {
    notFound()
  }

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

  // Fetch students list for the dropdown
  const supabase = await createServiceRoleClient()
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
      mode="edit"
      consultation={result.data as any}
    />
  )
}
