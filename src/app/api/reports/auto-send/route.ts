import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auto-report sending API endpoint
 * Triggered by cron job to automatically send monthly reports to guardians
 *
 * Schedule recommendation: 1st of each month at 9 AM
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { year, month } = await request.json()

    // Use current month if not specified
    const now = new Date()
    const targetYear = year || now.getFullYear()
    const targetMonth = month || now.getMonth() + 1

    const periodStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`

    // Get all unsent reports for the target period with guardian emails
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        id,
        student_id,
        report_type,
        period_start,
        period_end,
        students (
          id,
          student_code,
          users (
            id,
            name,
            email
          )
        )
      `)
      .eq('period_start', periodStart)
      .is('sent_at', null)

    if (reportsError) throw reportsError

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        message: 'No reports to send',
        count: 0,
        period: periodStart
      })
    }

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const report of reports) {
      const student = Array.isArray(report.students) ? report.students[0] : report.students
      const userInfo = Array.isArray(student?.users) ? student.users[0] : student?.users
      const guardianEmail = userInfo?.email

      if (!guardianEmail) {
        failedCount++
        errors.push(`${userInfo?.name || 'Unknown'}: No email registered`)
        continue
      }

      try {
        // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
        // For now, we'll log the email notification
        const { error: logError } = await supabase.from('notification_logs').insert({
          student_id: student?.id,
          notification_type: 'email',
          status: 'sent',
          message: `${targetYear}년 ${targetMonth}월 월간 리포트가 발송되었습니다.`,
          sent_at: new Date().toISOString(),
        })

        if (logError) throw logError

        // Update report sent_at timestamp
        const { error: updateError } = await supabase
          .from('reports')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', report.id)

        if (updateError) throw updateError

        sentCount++
      } catch (error: unknown) {
        failedCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${userInfo?.name || 'Unknown'}: ${errorMessage}`)

        // Log failure
        await supabase.from('notification_logs').insert({
          student_id: student?.id,
          notification_type: 'email',
          status: 'failed',
          message: `${targetYear}년 ${targetMonth}월 월간 리포트 발송 실패`,
          error_message: errorMessage,
          sent_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      message: 'Report auto-send completed',
      period: periodStart,
      total: reports.length,
      sent: sentCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: unknown) {
    console.error('Auto-report send error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

/**
 * Get auto-send status for current month
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const now = new Date()
    const targetYear = year ? parseInt(year) : now.getFullYear()
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1

    const periodStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`

    // Get report statistics for the period
    const { data: allReports, error: allError } = await supabase
      .from('reports')
      .select('id, sent_at')
      .eq('period_start', periodStart)

    if (allError) throw allError

    const total = allReports?.length || 0
    const sent = allReports?.filter(r => r.sent_at !== null).length || 0
    const pending = total - sent

    // Get reports with guardian emails
    const { data: reportsWithEmail, error: emailError } = await supabase
      .from('reports')
      .select(`
        id,
        students!inner (
          users!inner (
            email
          )
        )
      `)
      .eq('period_start', periodStart)
      .not('students.users.email', 'is', null)

    if (emailError) throw emailError

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readyToSend = reportsWithEmail?.filter((r: any) => {
      return r.students?.users?.email
    }).length || 0

    return NextResponse.json({
      period: periodStart,
      total,
      sent,
      pending,
      readyToSend,
      lastRun: null, // TODO: Store last run timestamp
      nextRun: `${targetYear}년 ${targetMonth + 1}월 1일 오전 9시`, // Next month 1st at 9 AM
    })
  } catch (error: unknown) {
    console.error('Get auto-send status error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
