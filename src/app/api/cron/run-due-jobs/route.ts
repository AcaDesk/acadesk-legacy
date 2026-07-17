/**
 * 예약 배치 잡 실행 크론 엔드포인트
 *
 * Vercel Cron(vercel.json)이 주기적으로 호출하여, 실행 시점이 도래한
 * 예약 배치 잡(리포트 생성/코멘트/발송)을 모든 테넌트에 대해 실행한다.
 * 이전에는 스태프가 Jobs 페이지를 열어야만 실행되던 것을 서버 트리거로 전환.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 * (Vercel은 CRON_SECRET 환경변수가 설정되어 있으면 크론 호출에 자동으로 이 헤더를 붙인다)
 *
 * 실행 자격: 각 잡은 그 잡을 예약한 스태프(batch_jobs.created_by)의 컨텍스트로 실행된다.
 * 생성자가 삭제되었거나 스태프가 아니면 해당 잡은 건너뛴다 (로그로 관측).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { runWithSystemContext } from '@/lib/auth/system-context'
import { isBatchJobDue } from '@/lib/batch/due-jobs'
import { executePendingJobItems } from '@/app/actions/batch/jobs'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const STAFF_ROLES = ['owner', 'instructor', 'assistant']
/** 한 번의 크론 호출에서 실행할 최대 잡 수 (함수 실행 시간 한도 보호) */
const MAX_JOBS_PER_RUN = 3

export async function GET(request: NextRequest) {
  // 크론 시크릿 미설정 시 fail-closed
  if (!env.CRON_SECRET) {
    console.error('[cron/run-due-jobs] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()

    const { data: candidateJobs, error } = await supabase
      .from('batch_jobs')
      .select('id, tenant_id, created_by, status, job_params')
      .in('status', ['queued', 'running'])
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) throw error

    const now = Date.now()
    const dueJobs = (candidateJobs ?? []).filter((job) => isBatchJobDue(job, now))

    let executed = 0
    let failed = 0
    let skipped = 0

    for (const job of dueJobs.slice(0, MAX_JOBS_PER_RUN)) {
      // 잡 생성자를 실행 컨텍스트로 사용 (요청 입력이 아닌 DB 값 — system-context.ts 보안 주석 참조)
      if (!job.created_by) {
        console.warn(`[cron/run-due-jobs] Job ${job.id} has no created_by, skipping`)
        skipped++
        continue
      }

      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('id, tenant_id, role_code, email, name')
        .eq('id', job.created_by)
        .is('deleted_at', null)
        .maybeSingle()
      if (creatorError) {
        console.error(`[cron/run-due-jobs] Creator lookup failed for job ${job.id}:`, creatorError)
        skipped++
        continue
      }

      if (
        !creator ||
        creator.tenant_id !== job.tenant_id ||
        !STAFF_ROLES.includes(creator.role_code)
      ) {
        console.warn(
          `[cron/run-due-jobs] Job ${job.id} creator is missing, cross-tenant, or not staff — skipping`
        )
        skipped++
        continue
      }

      const result = await runWithSystemContext(
        {
          userId: creator.id,
          tenantId: creator.tenant_id,
          roleCode: creator.role_code,
          email: creator.email ?? undefined,
          name: creator.name ?? undefined,
        },
        () => executePendingJobItems(job.id)
      )

      if (result.success) {
        executed++
      } else {
        console.error(`[cron/run-due-jobs] Job ${job.id} execution failed:`, result.error)
        failed++
      }
    }

    return NextResponse.json({
      checked: candidateJobs?.length ?? 0,
      due: dueJobs.length,
      executed,
      failed,
      skipped,
    })
  } catch (error) {
    console.error('[cron/run-due-jobs] Error:', error)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
