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

    const { data: existingJob } = await supabase.from('batch_jobs').select('id').eq('idempotency_key', idempotencyKey).eq('tenant_id', tenantId).maybeSingle()
    if (existingJob) {
      return { success: true as const, data: existingJob.id as string, error: null }
    }

    const { data: job, error: jobError } = await supabase
      .from('batch_jobs')
      .insert({
        tenant_id: tenantId, draft_id: draftId, action_type: actionType,
        job_name: `${actionType} - ${targetIds.length}건`,
        job_params: draft.options ?? {}, status: 'queued',
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
