/**
 * Subject Server Actions
 *
 * 모든 과목 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

export interface Subject {
  id: string
  tenant_id: string
  name: string
  description: string | null
  code: string | null
  color: string
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SubjectStatistics extends Subject {
  class_count: number
}

export interface CreateSubjectInput {
  name: string
  description?: string | null
  code?: string | null
  color: string
  active: boolean
  sort_order: number
}

export interface UpdateSubjectInput {
  name: string
  description?: string | null
  code?: string | null
  color: string
  active: boolean
}

/**
 * 통계와 함께 모든 과목 조회
 * @returns 과목 목록 (클래스 수 포함)
 */
export async function getSubjectsWithStatistics() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Use raw SQL query to bypass view permissions
    const { data, error } = await supabase.rpc('get_subject_statistics', {
      p_tenant_id: tenantId
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getSubjectsWithStatistics] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

/**
 * 과목 생성
 * @param input - 과목 데이터
 * @returns 생성된 과목 또는 에러
 */
export async function createSubject(input: CreateSubjectInput) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
        code: input.code || null,
        color: input.color,
        active: input.active,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/settings/subjects')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createSubject] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 과목 수정
 * @param id - 과목 ID
 * @param input - 수정할 과목 데이터
 * @returns 수정된 과목 또는 에러
 */
export async function updateSubject(id: string, input: UpdateSubjectInput) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('subjects')
      .update({
        name: input.name,
        description: input.description,
        code: input.code,
        color: input.color,
        active: input.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/settings/subjects')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateSubject] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 과목 삭제 (soft delete)
 * @param id - 과목 ID
 * @returns 성공 여부
 */
export async function deleteSubject(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('subjects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw error
    }

    revalidatePath('/settings/subjects')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteSubject] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
