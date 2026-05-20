'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { normalizeBatchOptions } from '@/lib/batch-options'
import type {
  BatchJob,
  BatchJobItem,
  BatchJobProgress,
  BatchJobsFilter,
  JobStatus,
  JobItemStatus,
  BatchActionType,
  BatchOptions,
  ReportOptions,
  CommentOptions,
  SendOptions,
  BatchSchedule,
} from '@/core/types/batch.types'

const JOB_EXECUTION_BATCH_SIZE = 3

function getMonthlyRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

function getWeeklyRange(options: ReportOptions): { start: string; end: string } | { error: string } {
  if (options.weekStartDate && options.weekEndDate) {
    if (options.weekStartDate > options.weekEndDate) {
      return { error: '주간 리포트 시작일은 종료일보다 이전이어야 합니다.' }
    }
    return { start: options.weekStartDate, end: options.weekEndDate }
  }

  // Legacy 옵션 호환: weekStartDate/weekEndDate가 없을 경우 연/월 기준 1~7일로 보정
  if (options.year && options.month) {
    const start = `${options.year}-${String(options.month).padStart(2, '0')}-01`
    const end = `${options.year}-${String(options.month).padStart(2, '0')}-07`
    return { start, end }
  }

  return { error: '주간 리포트 기간 정보가 없습니다.' }
}

type ReportLookup = { mode: 'latest' } | { mode: 'period'; reportType: 'monthly' | 'weekly'; start: string; end: string }

function resolveReportLookup(options: CommentOptions | SendOptions): ReportLookup | { error: string } {
  const mode = options.targetReportMode ?? 'latest'
  if (mode === 'latest') {
    return { mode: 'latest' }
  }

  if (mode === 'monthly') {
    if (!options.reportYear || !options.reportMonth) {
      return { error: '월간 리포트 조회를 위해 연도/월을 설정해주세요.' }
    }
    const range = getMonthlyRange(options.reportYear, options.reportMonth)
    return { mode: 'period', reportType: 'monthly', start: range.start, end: range.end }
  }

  if (!options.reportStartDate || !options.reportEndDate) {
    return { error: '주간 리포트 조회를 위해 시작일/종료일을 설정해주세요.' }
  }
  if (options.reportStartDate > options.reportEndDate) {
    return { error: '시작일은 종료일보다 이전이어야 합니다.' }
  }
  return {
    mode: 'period',
    reportType: 'weekly',
    start: options.reportStartDate,
    end: options.reportEndDate,
  }
}

export async function getBatchJobs(filters?: BatchJobsFilter) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    let query = supabase.from('batch_jobs').select('*', { count: 'exact' }).eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false })
    if (filters?.actionType) query = query.eq('action_type', filters.actionType)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.createdBy) query = query.eq('created_by', filters.createdBy)
    if (filters?.dateFrom) query = query.gte('created_at', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('created_at', filters.dateTo)
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 20
    query = query.range((page - 1) * pageSize, page * pageSize - 1)
    const { data, error, count } = await query
    if (error) throw error
    return { success: true as const, data: { jobs: (data ?? []) as BatchJob[], total: count ?? 0, page, pageSize }, error: null }
  } catch (error) {
    console.error('[getBatchJobs] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function getBatchJobDetail(jobId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const [jobResult, itemsResult] = await Promise.all([
      supabase.from('batch_jobs').select('*').eq('id', jobId).eq('tenant_id', tenantId).is('deleted_at', null).single(),
      supabase.from('batch_job_items').select('*').eq('job_id', jobId).eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: true }),
    ])
    if (jobResult.error) throw jobResult.error
    if (itemsResult.error) throw itemsResult.error
    return { success: true as const, data: { job: jobResult.data as BatchJob, items: (itemsResult.data ?? []) as BatchJobItem[] }, error: null }
  } catch (error) {
    console.error('[getBatchJobDetail] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function updateJobItemStatus(itemId: string, status: JobItemStatus, resultData?: Record<string, unknown>, errorMessage?: string, errorCategory?: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const updatePayload: Record<string, unknown> = {
      status,
      ...(status === 'in_progress' && { started_at: new Date().toISOString() }),
      ...((status === 'completed' || status === 'failed' || status === 'skipped') && { completed_at: new Date().toISOString() }),
      ...(resultData && { result_data: resultData }),
      ...(errorMessage && { error_message: errorMessage }),
      ...(errorCategory && { error_category: errorCategory }),
      ...(status === 'failed' && { retryable: true }),
    }
    const { error } = await supabase.from('batch_job_items').update(updatePayload).eq('id', itemId).eq('tenant_id', tenantId)
    if (error) throw error
    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[updateJobItemStatus] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function updateJobProgress(jobId: string, progress: BatchJobProgress) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const updatePayload: Record<string, unknown> = {
      progress,
      ...(progress.processed === 0 && { started_at: new Date().toISOString(), status: 'running' }),
    }
    const { error } = await supabase.from('batch_jobs').update(updatePayload).eq('id', jobId).eq('tenant_id', tenantId)
    if (error) throw error
    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[updateJobProgress] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function completeJob(jobId: string, finalStatus: JobStatus) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('batch_jobs').update({ status: finalStatus, completed_at: new Date().toISOString() }).eq('id', jobId).eq('tenant_id', tenantId)
    if (error) throw error
    const { data: job } = await supabase.from('batch_jobs').select('draft_id').eq('id', jobId).single()
    if (job?.draft_id) {
      await supabase.from('batch_drafts').update({ status: 'archived' }).eq('id', job.draft_id).eq('tenant_id', tenantId)
    }
    revalidatePath('/reports')
    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[completeJob] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function retryFailedItems(jobId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data: items, error: fetchError } = await supabase.from('batch_job_items').select('id').eq('job_id', jobId).eq('tenant_id', tenantId).eq('status', 'failed').eq('retryable', true).is('deleted_at', null)
    if (fetchError) throw fetchError
    const retryIds = (items ?? []).map((i) => i.id)
    if (retryIds.length === 0) return { success: true as const, data: { retryCount: 0 }, error: null }
    const { error: updateError } = await supabase.from('batch_job_items').update({ status: 'pending', error_message: null, error_category: null, started_at: null, completed_at: null }).in('id', retryIds).eq('tenant_id', tenantId)
    if (updateError) throw updateError
    await supabase.from('batch_jobs').update({ status: 'running', completed_at: null }).eq('id', jobId).eq('tenant_id', tenantId)
    revalidatePath(`/reports/jobs/${jobId}`)
    return { success: true as const, data: { retryCount: retryIds.length }, error: null }
  } catch (error) {
    console.error('[retryFailedItems] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function executePendingJobItems(jobId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: job, error: jobError } = await supabase
      .from('batch_jobs')
      .select('id, draft_id, status, action_type, job_params, progress')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()
    if (jobError) throw jobError

    if (job.status === 'canceled') {
      return {
        success: true as const,
        data: {
          progress: { total: 0, processed: 0, success: 0, failed: 0 } as BatchJobProgress,
          status: 'canceled' as JobStatus,
        },
        error: null,
      }
    }

    const schedule = (((job.job_params ?? {}) as Record<string, unknown>)._schedule ?? { mode: 'now' }) as BatchSchedule
    if (job.status === 'queued' && schedule.mode === 'scheduled' && schedule.scheduledAt) {
      const scheduledAt = new Date(schedule.scheduledAt).getTime()
      if (!Number.isNaN(scheduledAt) && scheduledAt > Date.now()) {
        return {
          success: true as const,
          data: {
            progress: (job.progress ?? { total: 0, processed: 0, success: 0, failed: 0 }) as BatchJobProgress,
            status: 'queued' as JobStatus,
          },
          error: null,
        }
      }
    }

    const { data: items, error: itemsError } = await supabase
      .from('batch_job_items')
      .select('id, target_id, status')
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (itemsError) throw itemsError

    const allItems = items ?? []
    const total = allItems.length
    let success = allItems.filter((item) => item.status === 'completed').length
    let failed = allItems.filter((item) => item.status === 'failed').length
    let processed = allItems.filter((item) => item.status === 'completed' || item.status === 'failed' || item.status === 'skipped').length

    const progress: BatchJobProgress = { total, processed, success, failed }
    await supabase
      .from('batch_jobs')
      .update({ status: 'running', completed_at: null, progress, started_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('tenant_id', tenantId)

    const resumableItems = allItems.filter((item) => item.status === 'pending' || item.status === 'in_progress')

    let wasCanceled = false
    for (let i = 0; i < resumableItems.length; i += JOB_EXECUTION_BATCH_SIZE) {
      const { data: statusCheck, error: statusError } = await supabase
        .from('batch_jobs')
        .select('status')
        .eq('id', jobId)
        .eq('tenant_id', tenantId)
        .single()
      if (statusError) throw statusError
      if (statusCheck.status === 'canceled') {
        wasCanceled = true
        break
      }

      const batch = resumableItems.slice(i, i + JOB_EXECUTION_BATCH_SIZE)
      for (const item of batch) {
        const { data: liveStatus } = await supabase
          .from('batch_jobs')
          .select('status')
          .eq('id', jobId)
          .eq('tenant_id', tenantId)
          .single()
        if (liveStatus?.status === 'canceled') {
          wasCanceled = true
          break
        }

        const { data: itemStatusCheck } = await supabase
          .from('batch_job_items')
          .select('status')
          .eq('id', item.id)
          .eq('tenant_id', tenantId)
          .single()

        if (itemStatusCheck?.status === 'skipped') {
          processed++
          continue
        }

        await supabase
          .from('batch_job_items')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('tenant_id', tenantId)

        const execution = await executeSingleBatchItem(
          item.target_id as string,
          job.action_type as BatchActionType,
          (job.job_params ?? {}) as BatchOptions
        )

        if (execution.success) {
          await supabase
            .from('batch_job_items')
            .update({
              status: 'completed',
              result_data: execution.data ?? null,
              error_message: null,
              error_category: null,
              completed_at: new Date().toISOString(),
            })
            .eq('id', item.id)
            .eq('tenant_id', tenantId)
          success++
        } else {
          await supabase
            .from('batch_job_items')
            .update({
              status: 'failed',
              error_message: execution.error ?? '처리 중 오류가 발생했습니다.',
              error_category: 'execution_error',
              retryable: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', item.id)
            .eq('tenant_id', tenantId)
          failed++
        }

        processed++
      }

      if (wasCanceled) break

      await supabase
        .from('batch_jobs')
        .update({
          status: 'running',
          progress: { total, processed, success, failed } as BatchJobProgress,
        })
        .eq('id', jobId)
        .eq('tenant_id', tenantId)
    }

    if (wasCanceled) {
      const { data: canceledJob } = await supabase
        .from('batch_jobs')
        .select('status, progress')
        .eq('id', jobId)
        .eq('tenant_id', tenantId)
        .single()

      return {
        success: true as const,
        data: {
          progress: (canceledJob?.progress ?? progress) as BatchJobProgress,
          status: (canceledJob?.status ?? 'canceled') as JobStatus,
        },
        error: null,
      }
    }

    const finalStatus: JobStatus =
      failed === 0 ? 'succeeded' : success > 0 ? 'partial_failed' : 'failed'

    await supabase
      .from('batch_jobs')
      .update({
        progress: { total, processed, success, failed } as BatchJobProgress,
      })
      .eq('id', jobId)
      .eq('tenant_id', tenantId)

    const completeResult = await completeJob(jobId, finalStatus)
    if (!completeResult.success) {
      throw new Error(completeResult.error ?? '작업 완료 처리 실패')
    }

    return {
      success: true as const,
      data: {
        progress: { total, processed, success, failed } as BatchJobProgress,
        status: finalStatus,
      },
      error: null,
    }
  } catch (error) {
    console.error('[executePendingJobItems] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function cancelJob(jobId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data: job, error: jobError } = await supabase.from('batch_jobs').select('status').eq('id', jobId).eq('tenant_id', tenantId).single()
    if (jobError) throw jobError
    if (job.status !== 'queued' && job.status !== 'running') throw new Error('실행 중이거나 대기 중인 작업만 취소할 수 있습니다.')
    await supabase.from('batch_job_items').update({ status: 'skipped', completed_at: new Date().toISOString() }).eq('job_id', jobId).eq('tenant_id', tenantId).eq('status', 'pending')
    const { error: updateError } = await supabase.from('batch_jobs').update({ status: 'canceled', completed_at: new Date().toISOString() }).eq('id', jobId).eq('tenant_id', tenantId)
    if (updateError) throw updateError
    revalidatePath(`/reports/jobs/${jobId}`)
    revalidatePath('/reports')
    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[cancelJob] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function getFailedItemsCsv(jobId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data: items, error } = await supabase.from('batch_job_items').select('target_id, target_name, status, error_message, error_category, retry_count').eq('job_id', jobId).eq('tenant_id', tenantId).eq('status', 'failed').is('deleted_at', null).order('created_at', { ascending: true })
    if (error) throw error
    const header = '대상ID,대상이름,상태,에러메시지,에러분류,재시도횟수'
    const rows = (items ?? []).map((item) =>
      [item.target_id, `"${(item.target_name ?? '').replace(/"/g, '""')}"`, item.status, `"${(item.error_message ?? '').replace(/"/g, '""')}"`, item.error_category ?? '', item.retry_count].join(',')
    )
    const csv = [header, ...rows].join('\n')
    return { success: true as const, data: csv, error: null }
  } catch (error) {
    console.error('[getFailedItemsCsv] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function getLatestJobForDraft(draftId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('batch_jobs')
      .select('*')
      .eq('draft_id', draftId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return { success: true as const, data: (data ?? null) as BatchJob | null, error: null }
  } catch (error) {
    console.error('[getLatestJobForDraft] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function runDueScheduledBatchJobs(limit = 1) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data: candidateJobs, error } = await supabase
      .from('batch_jobs')
      .select('id, status, job_params')
      .eq('tenant_id', tenantId)
      .in('status', ['queued', 'running'])
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) throw error

    const now = Date.now()
    const dueJobs = (candidateJobs ?? []).filter((job) => {
      if (job.status === 'running') return true
      const params = (job.job_params ?? {}) as Record<string, unknown>
      const schedule = (params._schedule ?? { mode: 'now' }) as BatchSchedule
      if (schedule.mode !== 'scheduled') return true
      if (!schedule.scheduledAt) return true
      const scheduledAt = new Date(schedule.scheduledAt).getTime()
      if (Number.isNaN(scheduledAt)) return true
      return scheduledAt <= now
    })

    let triggered = 0
    let failed = 0
    for (const job of dueJobs.slice(0, Math.max(1, limit))) {
      const result = await executePendingJobItems(job.id as string)
      if (result.success) {
        triggered++
      } else {
        failed++
      }
    }

    return {
      success: true as const,
      data: { dueCount: dueJobs.length, triggered, failed },
      error: null,
    }
  } catch (error) {
    console.error('[runDueScheduledBatchJobs] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

async function findTargetReport(
  tenantId: string,
  targetId: string,
  options: CommentOptions | SendOptions
) {
  const supabase = createServiceRoleClient()
  const lookup = resolveReportLookup(options)
  if ('error' in lookup) {
    return { success: false as const, data: null, error: lookup.error }
  }

  let query = supabase
    .from('reports')
    .select('id, content')
    .eq('student_id', targetId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (lookup.mode === 'latest') {
    query = query.order('created_at', { ascending: false }).limit(1)
  } else {
    query = query
      .eq('report_type', lookup.reportType)
      .eq('period_start', lookup.start)
      .eq('period_end', lookup.end)
      .order('created_at', { ascending: false })
      .limit(1)
  }

  const { data: report, error } = await query.maybeSingle()
  if (error) {
    return { success: false as const, data: null, error: '리포트 조회 중 오류가 발생했습니다.' }
  }
  if (!report) {
    const message =
      lookup.mode === 'latest'
        ? '해당 학생의 리포트를 찾을 수 없습니다.'
        : `${lookup.reportType === 'monthly' ? '월간' : '주간'} 지정 기간 리포트를 찾을 수 없습니다.`
    return { success: false as const, data: null, error: message }
  }

  return {
    success: true as const,
    data: {
      id: report.id as string,
      content: (report.content as Record<string, unknown> | null) ?? null,
    },
    error: null,
  }
}

/**
 * 단일 배치 아이템 실행 (실제 도메인 액션 디스패치)
 *
 * action_type에 따라:
 * - report: 월간 리포트 생성 + 저장
 * - comment: 최근 리포트에 자동 코멘트 업데이트
 * - send: 최근 리포트를 보호자에게 전송
 */
export async function executeSingleBatchItem(
  targetId: string,
  actionType: BatchActionType,
  options: BatchOptions
): Promise<{ success: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    if (actionType === 'report') {
      const opts = normalizeBatchOptions('report', options) as ReportOptions
      const { generateMonthlyReport, generateWeeklyReport, saveReport } = await import('@/app/actions/reports/report-generation')
      const reportType = (opts.reportType as 'weekly' | 'monthly') ?? 'monthly'
      let genResult: Awaited<ReturnType<typeof generateWeeklyReport>>
      if (reportType === 'weekly') {
        const weekly = getWeeklyRange(opts)
        if ('error' in weekly) {
          return { success: false, error: weekly.error }
        }
        genResult = await generateWeeklyReport(targetId, weekly.start, weekly.end)
      } else {
        genResult = await generateMonthlyReport(targetId, opts.year, opts.month)
      }
      if (!genResult.success || !genResult.data) {
        return { success: false, error: genResult.error || '리포트 생성 실패' }
      }
      const saveResult = await saveReport(genResult.data, reportType)
      if (!saveResult.success || !saveResult.data) {
        return { success: false, error: saveResult.error || '리포트 저장 실패' }
      }
      return { success: true, data: { reportId: saveResult.data.id } }
    }

    if (actionType === 'comment') {
      const { tenantId } = await verifyStaff()
      const commentOptions = normalizeBatchOptions('comment', options) as CommentOptions
      const reportResult = await findTargetReport(tenantId, targetId, commentOptions)
      if (!reportResult.success || !reportResult.data) {
        return { success: false, error: reportResult.error || '해당 학생의 리포트를 찾을 수 없습니다.' }
      }

      const report = reportResult.data
      // 이미 코멘트가 있고 overwrite=false면 스킵
      const content = report.content as Record<string, unknown> | null
      if (content?.comment && !commentOptions.overwriteExisting) {
        return { success: true, data: { reportId: report.id, skipped: true } }
      }
      // 자동 코멘트 생성
      const { generateInstructorComment } = await import('@/app/actions/reports/report-helpers')
      const attendance = (content?.attendance as { total: number; present: number; late: number; absent: number; rate: number }) ?? { total: 0, present: 0, late: 0, absent: 0, rate: 0 }
      const scores = (content?.scores as Array<{ category: string; current: number | null; previous: number | null; change: number | null; tests: unknown[] }>) ?? []
      const autoComment = generateInstructorComment(attendance, scores)
      const { updateReportComment } = await import('@/app/actions/reports/send')
      const updateResult = await updateReportComment(report.id, {
        summary: autoComment,
        strengths: '',
        improvements: '',
        nextGoals: '',
      })
      if (!updateResult.success) {
        return { success: false, error: updateResult.error || '코멘트 업데이트 실패' }
      }
      return { success: true, data: { reportId: report.id } }
    }

    if (actionType === 'send') {
      const { tenantId } = await verifyStaff()
      const sendOptions = normalizeBatchOptions('send', options) as SendOptions
      const reportResult = await findTargetReport(tenantId, targetId, sendOptions)
      if (!reportResult.success || !reportResult.data) {
        return { success: false, error: reportResult.error || '해당 학생의 리포트를 찾을 수 없습니다.' }
      }
      const { sendReportToAllGuardians } = await import('@/app/actions/reports/send')
      const sendResult = await sendReportToAllGuardians(reportResult.data.id, {
        channel: sendOptions.channel,
        subject: sendOptions.subject,
        messageBody: sendOptions.messageBody,
        kakaoTemplateId: sendOptions.kakaoTemplateId,
      })
      if (!sendResult.success) {
        return { success: false, error: sendResult.error || '전송 실패' }
      }
      return { success: true, data: { reportId: reportResult.data.id, total: sendResult.data?.total, successCount: sendResult.data?.successCount } }
    }

    return { success: false, error: `지원되지 않는 작업 유형: ${actionType}` }
  } catch (error) {
    console.error('[executeSingleBatchItem] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
