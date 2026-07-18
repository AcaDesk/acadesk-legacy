/**
 * 헬스체크 엔드포인트
 *
 * 업타임 모니터(예: UptimeRobot, Vercel Checks)용.
 * DB 연결까지 확인하며, 내부 정보는 노출하지 않는다.
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DB_CHECK_TIMEOUT_MS = 3000

export async function GET() {
  let dbStatus: 'ok' | 'error' | 'timeout' = 'ok'

  try {
    const supabase = createServiceRoleClient()
    const check = supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    const timeout = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), DB_CHECK_TIMEOUT_MS)
    )

    const result = await Promise.race([check, timeout])
    if (result === 'timeout') {
      dbStatus = 'timeout'
    } else if (result.error) {
      dbStatus = 'error'
    }
  } catch {
    dbStatus = 'error'
  }

  const healthy = dbStatus === 'ok'
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', db: dbStatus },
    { status: healthy ? 200 : 503 }
  )
}
