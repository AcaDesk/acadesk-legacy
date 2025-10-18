/**
 * Get Student Invoices Use Case
 * 학생 청구서 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { logError } from '@/lib/error-handlers'

export interface InvoiceDTO {
  id: string
  billing_month: string
  issue_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: string
  notes: string | null
  created_at: string
  invoice_items: Array<{
    id: string
    description: string
    amount: number
    item_type: string
  }>
  payments: Array<{
    id: string
    payment_date: string
    paid_amount: number
    payment_method: string
    reference_number: string | null
  }>
}

export class GetStudentInvoicesUseCase {
  async execute(studentId: string, limit: number = 12): Promise<InvoiceDTO[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        billing_month,
        issue_date,
        due_date,
        total_amount,
        paid_amount,
        status,
        notes,
        created_at,
        invoice_items (
          id,
          description,
          amount,
          item_type
        ),
        payments (
          id,
          payment_date,
          paid_amount,
          payment_method,
          reference_number
        )
      `)
      .eq('student_id', studentId)
      .order('billing_month', { ascending: false })
      .limit(limit)

    if (error) {
      // 테이블이 없는 경우 조용히 실패
      const errorMessage = error.message || String(error)
      if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
        logError(error, {
          useCase: 'GetStudentInvoicesUseCase',
          method: 'execute',
          studentId
        })
      }
      return []
    }

    return (data || []) as unknown as InvoiceDTO[]
  }
}
