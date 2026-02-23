'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { BatchJob, BatchJobItem, BatchJobProgress, BatchJobsFilter, JobStatus, JobItemStatus, BatchActionType, BatchOptions, ReportOptions } from '@/core/types/batch.types'

const JOB_EXECUTION_BATCH_SIZE = 3

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

export async function getRecentBatchJobs(limit = 5) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.from('batch_jobs').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }).limit(limit)
    if (error) throw error
    return { success: true as const, data: (data ?? []) as BatchJob[], error: null }
  } catch (error) {
    console.error('[getRecentBatchJobs] Error:', error)
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
    revalidatePath('/jobs')
    revalidatePath('/batch')
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
    revalidatePath(`/jobs/${jobId}`)
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
      .select('id, draft_id, status, action_type, job_params')
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
    revalidatePath(`/jobs/${jobId}`)
    revalidatePath('/jobs')
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

export async function saveBatchJobAsTemplate(jobId: string, name: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('batch_jobs').update({ is_template: true, template_name: name }).eq('id', jobId).eq('tenant_id', tenantId)
    if (error) throw error
    revalidatePath('/batch')
    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[saveBatchJobAsTemplate] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function getBatchJobTemplates() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.from('batch_jobs').select('*').eq('tenant_id', tenantId).eq('is_template', true).is('deleted_at', null).order('created_at', { ascending: false })
    if (error) throw error
    return { success: true as const, data: (data ?? []) as BatchJob[], error: null }
  } catch (error) {
    console.error('[getBatchJobTemplates] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
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
      const opts = options as ReportOptions
      const { generateMonthlyReport, generateWeeklyReport, saveReport } = await import('@/app/actions/reports/report-generation')
      const reportType = (opts.reportType as 'weekly' | 'monthly') ?? 'monthly'
      const genResult = reportType === 'weekly'
        ? await generateWeeklyReport(
            targetId,
            `${opts.year}-${String(opts.month).padStart(2, '0')}-01`,
            `${opts.year}-${String(opts.month).padStart(2, '0')}-07`
          )
        : await generateMonthlyReport(targetId, opts.year, opts.month)
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
      const supabase = createServiceRoleClient()
      // 해당 학생의 가장 최근 리포트 조회
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('id, content')
        .eq('student_id', targetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (reportError || !report) {
        return { success: false, error: '해당 학생의 리포트를 찾을 수 없습니다.' }
      }
      // 이미 코멘트가 있고 overwrite=false면 스킵
      const content = report.content as Record<string, unknown> | null
      if (content?.comment && !(options as { overwriteExisting?: boolean }).overwriteExisting) {
        return { success: true, data: { reportId: report.id, skipped: true } }
      }
      // 자동 코멘트 생성
      const { generateInstructorComment } = await import('@/app/actions/reports/report-helpers')
      const attendance = (content?.attendance as { total: number; present: number; late: number; absent: number; rate: number }) ?? { total: 0, present: 0, late: 0, absent: 0, rate: 0 }
      const scores = (content?.scores as Array<{ category: string; current: number | null; previous: number | null; change: number | null; tests: unknown[] }>) ?? []
      const autoComment = generateInstructorComment(attendance, scores)
      const { updateReportComment } = await import('@/app/actions/reports-send')
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
      const supabase = createServiceRoleClient()
      // 해당 학생의 가장 최근 리포트 조회
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('id')
        .eq('student_id', targetId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (reportError || !report) {
        return { success: false, error: '해당 학생의 리포트를 찾을 수 없습니다.' }
      }
      const { sendReportToAllGuardians } = await import('@/app/actions/reports-send')
      const sendResult = await sendReportToAllGuardians(report.id)
      if (!sendResult.success) {
        return { success: false, error: sendResult.error || '전송 실패' }
      }
      return { success: true, data: { reportId: report.id, total: sendResult.data?.total, successCount: sendResult.data?.successCount } }
    }

    return { success: false, error: `지원되지 않는 작업 유형: ${actionType}` }
  } catch (error) {
    console.error('[executeSingleBatchItem] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
