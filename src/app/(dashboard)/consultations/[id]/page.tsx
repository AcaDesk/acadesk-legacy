import { notFound } from 'next/navigation'
import { getConsultationById } from '@/app/actions/consultations'
import { ConsultationDetailClient } from './consultation-detail-client'

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getConsultationById(id, true)

  if (!result.success || !result.data) {
    notFound()
  }

  // Type assertion needed due to complex nested relations from Supabase
  return <ConsultationDetailClient consultation={result.data as any} />
}
