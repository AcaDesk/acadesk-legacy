'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type {
  BatchDraft,
  BatchTarget,
  CreateBatchDraftPayload,
  PatchBatchDraftPayload,
  ReviewBatchDraftResult,
  BatchValidationItem,
  BatchSchedule,
  BatchOptions,
  BatchActionType,
  ReportOptions,
  CommentOptions,
  SendOptions,
} from '@/core/types/batch.types'

export async function createBatchDraft(payload?: CreateBatchDraftPayload) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('batch_drafts')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        target_ids: payload?.targetIds ?? [],
        target_snapshot_count: payload?.targetIds?.length ?? 0,
        action_type: payload?.actionType ?? null,
        options: payload?.options ?? {},
        schedule: payload?.schedule ?? { mode: 'now' },
        step: 'targets',
        status: 'draft',
      })
      .select('id')
      .single()
    if (error) throw error
    return { success: true as const, data: data.id as string, error: null }
  } catch (error) {
    console.error('[createBatchDraft] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

function stripInternalJobParams(jobParams: Record<string, unknown>): BatchOptions {
  const entries = Object.entries(jobParams).filter(([key]) => !key.startsWith('_'))
  return Object.fromEntries(entries) as BatchOptions
}

export async function createBatchDraftFromTemplate(templateJobId: string) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: templateJob, error: templateError } = await supabase
      .from('batch_jobs')
      .select('id, draft_id, action_type, job_params, is_template')
      .eq('id', templateJobId)
      .eq('tenant_id', tenantId)
      .eq('is_template', true)
      .is('deleted_at', null)
      .single()

    if (templateError || !templateJob) {
      throw new Error('템플릿 정보를 찾을 수 없습니다.')
    }

    let targetIds: string[] = []
    let schedule: BatchSchedule = { mode: 'now' }
    let sourceOptions = stripInternalJobParams((templateJob.job_params ?? {}) as Record<string, unknown>)

    if (templateJob.draft_id) {
      const { data: sourceDraft } = await supabase
        .from('batch_drafts')
        .select('target_ids, schedule, options')
        .eq('id', templateJob.draft_id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()

      if (sourceDraft) {
        targetIds = (sourceDraft.target_ids ?? []) as string[]
        sourceOptions = stripInternalJobParams((sourceDraft.options ?? templateJob.job_params ?? {}) as Record<string, unknown>)
        schedule = ((sourceDraft.schedule ?? { mode: 'now' }) as BatchSchedule)
      }
    }

    // 과거 시각 예약은 복원 시 즉시 실행으로 초기화
    if (schedule.mode === 'scheduled' && schedule.scheduledAt) {
      const scheduledTime = new Date(schedule.scheduledAt).getTime()
      if (!Number.isNaN(scheduledTime) && scheduledTime <= Date.now()) {
        schedule = { mode: 'now' }
      }
    }

    const { data, error } = await supabase
      .from('batch_drafts')
      .insert({
        tenant_id: tenantId,
        created_by: userId,
        target_ids: targetIds,
        target_snapshot_count: targetIds.length,
        action_type: templateJob.action_type as BatchActionType,
        options: sourceOptions,
        schedule,
        step: 'targets',
        status: 'draft',
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true as const, data: data.id as string, error: null }
  } catch (error) {
    console.error('[createBatchDraftFromTemplate] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function getBatchDraft(draftId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('batch_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()
    if (error) throw error
    return { success: true as const, data: data as BatchDraft, error: null }
  } catch (error) {
    console.error('[getBatchDraft] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function patchBatchDraft(draftId: string, patch: PatchBatchDraftPayload) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('batch_drafts')
      .update(patch)
      .eq('id', draftId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single()
    if (error) throw error
    revalidatePath(`/batch/new/${draftId}`)
    return { success: true as const, data: data as BatchDraft, error: null }
  } catch (error) {
    console.error('[patchBatchDraft] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function reviewBatchDraft(draftId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { data: draft, error: draftError } = await supabase
      .from('batch_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()
    if (draftError) throw draftError

    const targetIds = (draft.target_ids ?? []) as string[]
    const actionType = draft.action_type as string
    const options = (draft.options ?? {}) as ReportOptions | CommentOptions | SendOptions
    const schedule = (draft.schedule ?? { mode: 'now' }) as BatchSchedule

    const sampleIds = targetIds.slice(0, 5)
    const { data: sampleStudents } = await supabase
      .from('students')
      .select('id, student_code, users!inner(name)')
      .eq('tenant_id', tenantId)
      .in('id', sampleIds)

    const samples: BatchTarget[] = (sampleStudents ?? []).map((s: Record<string, unknown>) => {
      const user = s.users as Record<string, unknown> | null
      return {
        id: s.id as string,
        name: (user?.name as string) ?? '이름 없음',
        student_code: (s.student_code as string) ?? null,
        grade: null,
        class_name: null,
        class_id: null,
      }
    })

    const risks: BatchValidationItem[] = []
    if (targetIds.length === 0) {
      risks.push({ level: 'error', code: 'NO_TARGETS', message: '선택된 대상이 없습니다.', blocking: true })
    }
    if (targetIds.length > 100) {
      risks.push({ level: 'warning', code: 'LARGE_BATCH', message: `대상이 ${targetIds.length}명으로 많아 처리 시간이 오래 걸릴 수 있습니다.`, blocking: false })
    }
    if (!actionType) {
      risks.push({ level: 'error', code: 'NO_ACTION', message: '작업 유형이 선택되지 않았습니다.', blocking: true })
    }

    if (actionType === 'report') {
      const reportOptions = options as ReportOptions
      if (reportOptions.reportType === 'weekly') {
        if (!reportOptions.weekStartDate || !reportOptions.weekEndDate) {
          risks.push({ level: 'error', code: 'WEEKLY_PERIOD_REQUIRED', message: '주간 리포트는 시작일/종료일이 필요합니다.', blocking: true })
        } else if (reportOptions.weekStartDate > reportOptions.weekEndDate) {
          risks.push({ level: 'error', code: 'WEEKLY_PERIOD_INVALID', message: '주간 리포트 시작일은 종료일보다 이전이어야 합니다.', blocking: true })
        }
      } else {
        if (!reportOptions.year || !reportOptions.month) {
          risks.push({ level: 'error', code: 'MONTHLY_PERIOD_REQUIRED', message: '월간 리포트는 연도/월 설정이 필요합니다.', blocking: true })
        }
      }
    }

    if (actionType === 'comment' || actionType === 'send') {
      const targetMode = (options as CommentOptions | SendOptions).targetReportMode ?? 'latest'
      if (targetMode === 'monthly') {
        const { reportYear, reportMonth } = options as CommentOptions | SendOptions
        if (!reportYear || !reportMonth) {
          risks.push({ level: 'error', code: 'TARGET_MONTHLY_REQUIRED', message: '월간 리포트 지정을 위해 연도/월을 설정해주세요.', blocking: true })
        }
      }
      if (targetMode === 'weekly') {
        const { reportStartDate, reportEndDate } = options as CommentOptions | SendOptions
        if (!reportStartDate || !reportEndDate) {
          risks.push({ level: 'error', code: 'TARGET_WEEKLY_REQUIRED', message: '주간 리포트 지정을 위해 시작일/종료일을 설정해주세요.', blocking: true })
        } else if (reportStartDate > reportEndDate) {
          risks.push({ level: 'error', code: 'TARGET_WEEKLY_INVALID', message: '시작일은 종료일보다 이전이어야 합니다.', blocking: true })
        }
      }
    }

    if (schedule.mode === 'scheduled') {
      if (!schedule.scheduledAt) {
        risks.push({ level: 'error', code: 'SCHEDULE_REQUIRED', message: '예약 실행 시간을 입력해주세요.', blocking: true })
      } else {
        const scheduledTime = new Date(schedule.scheduledAt).getTime()
        if (Number.isNaN(scheduledTime)) {
          risks.push({ level: 'error', code: 'SCHEDULE_INVALID', message: '예약 실행 시간이 올바르지 않습니다.', blocking: true })
        } else if (scheduledTime <= Date.now()) {
          risks.push({ level: 'error', code: 'SCHEDULE_PAST', message: '예약 실행 시간은 현재보다 이후여야 합니다.', blocking: true })
        }
      }
    }

    const impactSummary = {
      totalTargets: targetIds.length,
      estimatedCreations: actionType === 'report' ? targetIds.length : 0,
      estimatedUpdates: actionType === 'comment' ? targetIds.length : 0,
      estimatedSends: actionType === 'send' ? targetIds.length : 0,
    }

    const hasBlockingRisk = risks.some((r) => r.blocking)
    if (!hasBlockingRisk) {
      await supabase.from('batch_drafts').update({ status: 'ready', validation: risks }).eq('id', draftId).eq('tenant_id', tenantId)
    } else {
      await supabase.from('batch_drafts').update({ validation: risks }).eq('id', draftId).eq('tenant_id', tenantId)
    }

    const result: ReviewBatchDraftResult = { impactSummary, samples, risks }
    return { success: true as const, data: result, error: null }
  } catch (error) {
    console.error('[reviewBatchDraft] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function executeBatchDraft(draftId: string, idempotencyKey: string) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: draft, error: draftError } = await supabase
      .from('batch_drafts').select('*').eq('id', draftId).eq('tenant_id', tenantId).is('deleted_at', null).single()
    if (draftError) throw draftError
    if (draft.status !== 'ready' && draft.status !== 'draft') {
      throw new Error('이미 실행 중이거나 완료된 작업입니다.')
    }

    const targetIds = (draft.target_ids ?? []) as string[]
    const actionType = draft.action_type as string
    const schedule = ((draft.schedule ?? { mode: 'now' }) as BatchSchedule)
    const normalizedSchedule: BatchSchedule =
      schedule.mode === 'scheduled' && schedule.scheduledAt
        ? { mode: 'scheduled', scheduledAt: schedule.scheduledAt }
        : { mode: 'now' }
    const jobParams = {
      ...((draft.options ?? {}) as Record<string, unknown>),
      _schedule: normalizedSchedule,
    }

    const { data: existingJob } = await supabase.from('batch_jobs').select('id').eq('idempotency_key', idempotencyKey).eq('tenant_id', tenantId).maybeSingle()
    if (existingJob) {
      return { success: true as const, data: existingJob.id as string, error: null }
    }

    const { data: job, error: jobError } = await supabase
      .from('batch_jobs')
      .insert({
        tenant_id: tenantId, draft_id: draftId, action_type: actionType,
        job_name: `${actionType} - ${targetIds.length}건`,
        job_params: jobParams, status: 'queued',
        progress: { total: targetIds.length, processed: 0, success: 0, failed: 0 },
        idempotency_key: idempotencyKey, created_by: userId,
      })
      .select('id').single()
    if (jobError) throw jobError

    const { data: students } = await supabase
      .from('students').select('id, student_code, users!inner(name)').eq('tenant_id', tenantId).in('id', targetIds)
    const nameMap = new Map<string, string>()
    for (const s of students ?? []) {
      const user = s.users as unknown as Record<string, unknown> | null
      nameMap.set(s.id as string, (user?.name as string) ?? '이름 없음')
    }

    const items = targetIds.map((targetId) => ({
      tenant_id: tenantId, job_id: job.id, target_id: targetId,
      target_name: nameMap.get(targetId) ?? null, status: 'pending' as const,
    }))
    const { error: itemsError } = await supabase.from('batch_job_items').insert(items)
    if (itemsError) throw itemsError

    await supabase.from('batch_drafts').update({ status: 'running', step: 'run' }).eq('id', draftId).eq('tenant_id', tenantId)

    revalidatePath('/batch')
    revalidatePath('/jobs')
    return { success: true as const, data: job.id as string, error: null }
  } catch (error) {
    console.error('[executeBatchDraft] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

export async function getStudentsForBatchFilter(filters?: { grade?: string; classId?: string; search?: string }) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    let query = supabase
      .from('students')
      .select('id, student_code, grade, users!inner(name), class_students(classes(id, name))')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.grade) query = query.eq('grade', filters.grade)
    if (filters?.search) query = query.or(`student_code.ilike.%${filters.search}%,users.name.ilike.%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error

    const students: BatchTarget[] = (data ?? []).map((s: Record<string, unknown>) => {
      const user = s.users as Record<string, unknown> | null
      const classStudents = s.class_students as Array<Record<string, unknown>> | null
      const firstClass = classStudents?.[0]?.classes as Record<string, unknown> | null
      return {
        id: s.id as string, name: (user?.name as string) ?? '이름 없음',
        student_code: (s.student_code as string) ?? null, grade: (s.grade as string) ?? null,
        class_name: (firstClass?.name as string) ?? null,
        class_id: (firstClass?.id as string) ?? null,
      }
    })

    const filtered = filters?.classId
      ? students.filter((s) => {
          const raw = (data ?? []).find((d: Record<string, unknown>) => d.id === s.id)
          const classStudents = raw?.class_students as Array<Record<string, unknown>> | null
          return classStudents?.some((cs) => {
            const cls = cs.classes as Record<string, unknown> | null
            return cls?.id === filters.classId
          })
        })
      : students

    return { success: true as const, data: filtered, error: null }
  } catch (error) {
    console.error('[getStudentsForBatchFilter] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}
