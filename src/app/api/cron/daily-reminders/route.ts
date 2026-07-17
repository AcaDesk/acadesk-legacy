/**
 * 데일리 리마인더 크론 엔드포인트
 *
 * 매일 1회(00:00 UTC = 09:00 KST, vercel.json) 호출되어
 * 숙제 마감 D-1·도서 반납 D-1 알림톡을 발송한다.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET} (run-due-jobs와 동일 패턴)
 */

import { NextRequest, NextResponse } from 'next/server'
import { runDailyReminders } from '@/lib/messaging/reminder-jobs'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    console.error('[cron/daily-reminders] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDailyReminders()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[cron/daily-reminders] Error:', error)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
