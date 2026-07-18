/**
 * 데일리 리마인더 잡 (크론 전용)
 *
 * /api/cron/daily-reminders에서 매일 1회 호출된다 (09:00 KST 권장).
 * 이벤트 구독이 활성(승인)된 테넌트에 대해서만 발송 대상을 조회하고,
 * 중복 발송은 대상 행의 발송 시각 컬럼(claim 후 발송)으로 방지한다.
 *
 * - homework_deadline: 내일 마감 미완료 숙제 → student_tasks.deadline_reminder_sent_at
 * - book_lending_reminder: 내일 반납 예정 미반납 도서 → book_lendings.reminder_sent_at
 * - payment_overdue: 기한 경과 청구서 연체 전환(구독 무관) + 미납 알림 → overdue_notified_at
 *
 * 발송 자체는 fireEventAlimtalk(절대 throw 안 함)에 위임하므로,
 * 개별 발송 실패는 notification_logs(status='failed')로 관측된다.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { fireEventAlimtalk } from '@/lib/messaging/event-alimtalk'

/** KST 기준 날짜 문자열 (YYYY-MM-DD), offsetDays만큼 이동 */
function kstDateString(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** date 문자열(YYYY-MM-DD)을 한국어 표기로 (예: 2026년 7월 18일) */
function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

export interface DailyRemindersResult {
  homeworkDeadline: number
  bookLendingReminder: number
  invoicesMarkedOverdue: number
  paymentOverdueNotices: number
}

export async function runDailyReminders(): Promise<DailyRemindersResult> {
  const supabase = createServiceRoleClient()
  const today = kstDateString(0)
  const tomorrow = kstDateString(1)
  const now = new Date().toISOString()
  const result: DailyRemindersResult = {
    homeworkDeadline: 0,
    bookLendingReminder: 0,
    invoicesMarkedOverdue: 0,
    paymentOverdueNotices: 0,
  }

  // 이벤트별 활성 구독 테넌트 (비활성 테넌트의 데이터는 스캔하지 않는다)
  const { data: subs, error: subsError } = await supabase
    .from('tenant_event_subscriptions')
    .select('tenant_id, event_type')
    .in('event_type', ['homework_deadline', 'book_lending_reminder', 'payment_overdue'])
    .eq('is_enabled', true)
    .eq('provisioning_status', 'approved')
  if (subsError) throw subsError

  const tenantsFor = (eventType: string) => [
    ...new Set(
      (subs ?? []).filter((s) => s.event_type === eventType).map((s) => s.tenant_id)
    ),
  ]
  const homeworkTenants = tenantsFor('homework_deadline')
  const lendingTenants = tenantsFor('book_lending_reminder')
  const overdueTenants = tenantsFor('payment_overdue')

  // ── 숙제 마감 D-1 리마인더 ─────────────────────────────────────────
  if (homeworkTenants.length > 0) {
    const { data: tasks, error: tasksError } = await supabase
      .from('student_tasks')
      .select('id, tenant_id, student_id, title, subject, due_date')
      .in('tenant_id', homeworkTenants)
      .eq('kind', 'homework')
      .eq('due_date', tomorrow)
      .is('completed_at', null)
      .is('deleted_at', null)
      .is('deadline_reminder_sent_at', null)
      .limit(500)
    if (tasksError) throw tasksError

    if (tasks && tasks.length > 0) {
      // claim 먼저 (크론 재실행/중복 트리거 시 이중 발송 방지)
      const { error: claimError } = await supabase
        .from('student_tasks')
        .update({ deadline_reminder_sent_at: now })
        .in('id', tasks.map((t) => t.id))
      if (claimError) throw claimError

      for (const task of tasks) {
        await fireEventAlimtalk(task.tenant_id, 'homework_deadline', task.student_id, {
          과목명: task.subject || '',
          숙제명: task.title || '숙제',
          마감일: formatKoreanDate(task.due_date),
        })
      }
      result.homeworkDeadline = tasks.length
    }
  }

  // ── 도서 반납 D-1 리마인더 ─────────────────────────────────────────
  if (lendingTenants.length > 0) {
    const { data: lendings, error: lendingsError } = await supabase
      .from('book_lendings')
      .select('id, tenant_id, student_id, due_date, textbooks ( title )')
      .in('tenant_id', lendingTenants)
      .eq('due_date', tomorrow)
      .is('returned_at', null)
      .is('reminder_sent_at', null)
      .limit(500)
    if (lendingsError) throw lendingsError

    if (lendings && lendings.length > 0) {
      const { error: claimError } = await supabase
        .from('book_lendings')
        .update({ reminder_sent_at: now })
        .in('id', lendings.map((l) => l.id))
      if (claimError) throw claimError

      for (const lending of lendings) {
        const textbook = lending.textbooks as { title?: string } | { title?: string }[] | null
        const bookTitle =
          (Array.isArray(textbook) ? textbook[0]?.title : textbook?.title) || '도서'

        await fireEventAlimtalk(lending.tenant_id, 'book_lending_reminder', lending.student_id, {
          도서명: bookTitle,
          반납일: formatKoreanDate(lending.due_date),
        })
      }
      result.bookLendingReminder = lendings.length
    }
  }

  // ── 청구서 연체 처리 ────────────────────────────────────────────────
  // 1) 기한 경과 청구서를 overdue로 전환 — 도메인 상태이므로 알림 구독과 무관하게 수행
  {
    const { data: marked, error: markError } = await supabase
      .from('tuition_invoices')
      .update({ status: 'overdue' })
      .lt('due_date', today)
      .in('status', ['unpaid', 'partially_paid'])
      .is('deleted_at', null)
      .select('id')
    if (markError) throw markError
    result.invoicesMarkedOverdue = marked?.length ?? 0
  }

  // 2) 구독 테넌트의 연체 청구서에 미납 안내 발송 (미발송분만)
  if (overdueTenants.length > 0) {
    const { data: overdueInvoices, error: overdueError } = await supabase
      .from('tuition_invoices')
      .select('id, tenant_id, student_id, billing_month, due_date, total_amount, paid_amount')
      .in('tenant_id', overdueTenants)
      .eq('status', 'overdue')
      .is('overdue_notified_at', null)
      .is('deleted_at', null)
      .limit(500)
    if (overdueError) throw overdueError

    if (overdueInvoices && overdueInvoices.length > 0) {
      // claim 먼저 (크론 재실행 중복 발송 방지)
      const { error: claimError } = await supabase
        .from('tuition_invoices')
        .update({ overdue_notified_at: now })
        .in('id', overdueInvoices.map((i) => i.id))
      if (claimError) throw claimError

      for (const invoice of overdueInvoices) {
        const remaining = Math.max(invoice.total_amount - invoice.paid_amount, 0)
        await fireEventAlimtalk(invoice.tenant_id, 'payment_overdue', invoice.student_id, {
          납부월: invoice.billing_month,
          납부금액: `${remaining.toLocaleString('ko-KR')}원`,
          납부기한: invoice.due_date,
        })
      }
      result.paymentOverdueNotices = overdueInvoices.length
    }
  }

  return result
}
