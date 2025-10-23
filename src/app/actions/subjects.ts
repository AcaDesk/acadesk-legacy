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
import { SubjectRepository } from '@infra/db/repositories/subject.repository'

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
    // 1. 권한 검증 (staff)
    await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()
    const repository = new SubjectRepository(supabase)

    const subjects = await repository.findAllWithStatistics()

    return {
      success: true,
      data: subjects,
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
    // 1. 권한 검증 (staff)
    await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()
    const repository = new SubjectRepository(supabase)

    const subject = await repository.create(input)

    // 3. 캐시 무효화
    revalidatePath('/settings/subjects')

    return {
      success: true,
      data: subject,
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
    // 1. 권한 검증 (staff)
    await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()
    const repository = new SubjectRepository(supabase)

    const subject = await repository.update(id, input)

    // 3. 캐시 무효화
    revalidatePath('/settings/subjects')

    return {
      success: true,
      data: subject,
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
 * 과목 삭제
 * @param id - 과목 ID
 * @returns 성공 여부
 */
export async function deleteSubject(id: string) {
  try {
    // 1. 권한 검증 (staff)
    await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()
    const repository = new SubjectRepository(supabase)

    await repository.delete(id)

    // 3. 캐시 무효화
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
