import { redirect } from 'next/navigation'
import { getTextbookById } from '@/app/actions/textbooks'
import { EditTextbookClient } from './edit-textbook-client'

type EditTextbookPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditTextbookPage({ params }: EditTextbookPageProps) {
  const resolvedParams = await params
  const textbookId = resolvedParams.id

  // Fetch data on server
  const result = await getTextbookById(textbookId, true)

  if (!result.success || !result.data) {
    redirect('/textbooks')
  }

  // TODO(types): Type will be available after migration is applied
  const textbook = result.data as unknown as {
    id: string
    title: string
    publisher: string | null
    isbn: string | null
    management_code: string | null
    total_copies: number | null
    price: number | null
    is_active: boolean
    textbook_units?: Array<{
      id: string
      unit_order: number
      unit_code: string | null
      unit_title: string
      total_pages: number | null
    }>
  }

  return (
    <EditTextbookClient
      textbookId={textbookId}
      initialData={{
        title: textbook.title,
        publisher: textbook.publisher || '',
        isbn: textbook.isbn || '',
        managementCode: textbook.management_code || '',
        totalCopies: (textbook.total_copies || 1).toString(),
        price: textbook.price?.toString() || '',
        isActive: textbook.is_active,
        units: (textbook.textbook_units || []).map((unit) => ({
          id: unit.id,
          tempId: unit.id,
          unitOrder: unit.unit_order,
          unitCode: unit.unit_code || '',
          unitTitle: unit.unit_title,
          totalPages: unit.total_pages?.toString() || '',
          isDeleted: false,
        })),
      }}
    />
  )
}
