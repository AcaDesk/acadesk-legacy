import { notFound } from 'next/navigation'
import { getConsultationById } from '@/app/actions/consultations'
import { ConsultationDetailClient } from './consultation-detail-client'

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  console.log('[ConsultationDetailPage] Fetching consultation with id:', id)

  const result = await getConsultationById(id, true)

  console.log('[ConsultationDetailPage] getConsultationById result:', {
    success: result.success,
    hasData: !!result.data,
    error: result.error,
  })

  if (!result.success || !result.data) {
    console.error('[ConsultationDetailPage] Not found - result:', result)
    notFound()
  }

  // Type assertion needed due to complex nested relations from Supabase
  return <ConsultationDetailClient consultation={result.data as any} />
}
