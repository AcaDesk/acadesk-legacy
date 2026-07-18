'use server'

/**
 * 수납/청구 변경 액션
 *
 * 다단계 쓰기(청구서+항목, 수납+상태 갱신)는 원자화 RPC
 * (migration 20260718000001)로 수행한다.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { withServerAction, withServerActionVoid } from '@/lib/server-action-helpers'
import { filterOwnedStudentIds } from '@/lib/tenant-guards'
import { mapWithConcurrency } from '@/lib/concurrency'
import { fireEventAlimtalk } from '@/lib/messaging/event-alimtalk'

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, '항목명을 입력해주세요').max(200),
  // discount 항목은 음수 허용
  amount: z.number().int().min(-100_000_000).max(100_000_000),
  item_type: z.enum(['tuition', 'material', 'extra', 'discount']).default('tuition'),
})

const createInvoicesSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, '대상 학생을 선택해주세요'),
  billingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '청구 월 형식이 올바르지 않습니다'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '납부 기한 형식이 올바르지 않습니다'),
  items: z.array(invoiceItemSchema).min(1, '청구 항목을 추가해주세요'),
  notes: z.string().trim().max(500).optional(),
})

export type CreateInvoicesInput = z.infer<typeof createInvoicesSchema>

/**
 * 청구서 일괄 생성 (선택 학생 × 청구 월)
 *
 * 이미 같은 달 청구서가 있는 학생은 건너뛰고 결과에 집계한다.
 */
export async function createInvoicesBulk(input: CreateInvoicesInput) {
  return withServerAction<{
    created: number
    skippedExisting: number
    failed: number
  } | null>(
    async ({ tenantId, serviceClient }) => {
      const validated = createInvoicesSchema.parse(input)

      const ownedIds = await filterOwnedStudentIds(
        serviceClient,
        tenantId,
        validated.studentIds
      )
      if (ownedIds.length === 0) {
        throw new Error('대상 학생을 찾을 수 없습니다')
      }

      const results = await mapWithConcurrency(ownedIds, 5, async (studentId) => {
        const { error } = await serviceClient.rpc('create_tuition_invoice', {
          p_tenant_id: tenantId,
          p_student_id: studentId,
          p_billing_month: validated.billingMonth,
          p_due_date: validated.dueDate,
          p_items: validated.items,
          p_notes: validated.notes ?? null,
        })

        if (!error) return 'created' as const
        // 학생·월 중복 청구는 스킵으로 집계
        if (error.code === '23505') return 'skipped' as const
        console.error(`[createInvoicesBulk] student ${studentId}:`, error.message)
        return 'failed' as const
      })

      revalidatePath('/payments')

      return {
        created: results.filter((r) => r === 'created').length,
        skippedExisting: results.filter((r) => r === 'skipped').length,
        failed: results.filter((r) => r === 'failed').length,
      }
    },
    { actionName: 'createInvoicesBulk', defaultValue: null }
  )
}

const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paidAmount: z.number().int().positive('수납 금액은 0원보다 커야 합니다'),
  paymentMethod: z.enum(['card', 'transfer', 'cash']),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
})

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

/**
 * 수납 처리 — 결제 기록 + 청구서 상태를 원자적으로 갱신하고,
 * 완납/부분납 결과에 따라 보호자에게 결제 완료 알림톡을 발송한다.
 */
export async function recordPayment(input: RecordPaymentInput) {
  return withServerAction<{
    paymentId: string
    status: string
    paidAmount: number
    totalAmount: number
  } | null>(
    async ({ tenantId, serviceClient }) => {
      const validated = recordPaymentSchema.parse(input)

      const { data, error } = await serviceClient.rpc('record_tuition_payment', {
        p_tenant_id: tenantId,
        p_invoice_id: validated.invoiceId,
        p_paid_amount: validated.paidAmount,
        p_payment_method: validated.paymentMethod,
        p_payment_date: validated.paymentDate ?? new Date().toISOString().split('T')[0],
        p_reference_number: validated.referenceNumber ?? null,
        p_notes: validated.notes ?? null,
      })

      if (error) throw error

      const result = data as {
        payment_id: string
        status: string
        paid_amount: number
        total_amount: number
        student_id: string
      }

      revalidatePath('/payments')

      // 결제 완료 알림톡 (fire-and-forget)
      const paymentDateStr = new Date(
        validated.paymentDate ?? new Date()
      ).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul',
      })
      void fireEventAlimtalk(tenantId, 'payment_confirmed', result.student_id, {
        결제금액: `${validated.paidAmount.toLocaleString('ko-KR')}원`,
        결제일: paymentDateStr,
      })

      return {
        paymentId: result.payment_id,
        status: result.status,
        paidAmount: result.paid_amount,
        totalAmount: result.total_amount,
      }
    },
    { actionName: 'recordPayment', defaultValue: null }
  )
}

/**
 * 청구서 삭제 (soft delete)
 */
export async function deleteInvoice(invoiceId: string) {
  return withServerActionVoid(
    async ({ tenantId, serviceClient }) => {
      const { error } = await serviceClient
        .from('tuition_invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (error) throw error
      revalidatePath('/payments')
    },
    { actionName: 'deleteInvoice' }
  )
}

/**
 * 미납 안내 수동 발송 — 선택한 청구서의 보호자에게 payment_overdue 알림톡 발송
 */
export async function sendPaymentReminders(invoiceIds: string[]) {
  return withServerAction<{ sent: number } | null>(
    async ({ tenantId, serviceClient }) => {
      if (invoiceIds.length === 0) {
        throw new Error('발송할 청구서를 선택해주세요')
      }

      const { data: invoices, error } = await serviceClient
        .from('tuition_invoices')
        .select('id, student_id, billing_month, due_date, total_amount, paid_amount')
        .eq('tenant_id', tenantId)
        .in('id', invoiceIds)
        .neq('status', 'paid')
        .is('deleted_at', null)

      if (error) throw error
      if (!invoices || invoices.length === 0) {
        throw new Error('발송 대상 미납 청구서가 없습니다')
      }

      await mapWithConcurrency(invoices, 5, async (invoice) => {
        const remaining = Math.max(invoice.total_amount - invoice.paid_amount, 0)
        await fireEventAlimtalk(tenantId, 'payment_overdue', invoice.student_id, {
          납부월: invoice.billing_month,
          납부금액: `${remaining.toLocaleString('ko-KR')}원`,
          납부기한: invoice.due_date,
        })
      })

      // 크론 중복 발송 방지 스탬프
      await serviceClient
        .from('tuition_invoices')
        .update({ overdue_notified_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .in('id', invoices.map((i) => i.id))

      return { sent: invoices.length }
    },
    { actionName: 'sendPaymentReminders', defaultValue: null }
  )
}
