/**
 * Subject Repository
 *
 * 과목 데이터 접근 레이어 - 순수 CRUD 작업만 수행
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import type { Subject, SubjectStatistics } from '@/types/subject'

// ==================== Types ====================

export interface CreateSubjectInput {
  name: string
  description?: string | null
  code?: string | null
  color: string
  active: boolean
  sort_order?: number
}

export interface UpdateSubjectInput {
  name?: string
  description?: string | null
  code?: string | null
  color?: string
  active?: boolean
  sort_order?: number
}

// ==================== Repository ====================

export class SubjectRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Subject ID로 조회
   */
  async findById(subjectId: string): Promise<Subject | null> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, {
          repository: 'SubjectRepository',
          method: 'findById',
          subjectId
        })
        throw new DatabaseError('과목을 조회할 수 없습니다', error)
      }

      return data as Subject | null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'findById' })
      throw new DatabaseError('과목을 조회할 수 없습니다')
    }
  }

  /**
   * Subject ID로 조회 (NotFound 에러 발생)
   */
  async findByIdOrThrow(subjectId: string): Promise<Subject> {
    const subject = await this.findById(subjectId)

    if (!subject) {
      throw new NotFoundError('과목')
    }

    return subject
  }

  /**
   * 전체 과목 목록 조회
   */
  async findAll(): Promise<Subject[]> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        logError(error, {
          repository: 'SubjectRepository',
          method: 'findAll'
        })
        throw new DatabaseError('과목 목록을 조회할 수 없습니다', error)
      }

      return (data || []) as Subject[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'findAll' })
      throw new DatabaseError('과목 목록을 조회할 수 없습니다')
    }
  }

  /**
   * 활성 과목 목록 조회
   */
  async findActive(): Promise<Subject[]> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .select('*')
        .is('deleted_at', null)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        logError(error, {
          repository: 'SubjectRepository',
          method: 'findActive'
        })
        throw new DatabaseError('활성 과목 목록을 조회할 수 없습니다', error)
      }

      return (data || []) as Subject[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'findActive' })
      throw new DatabaseError('활성 과목 목록을 조회할 수 없습니다')
    }
  }

  /**
   * 과목 통계 조회 (subject_statistics 뷰 사용)
   */
  async findAllWithStatistics(): Promise<SubjectStatistics[]> {
    try {
      const { data, error } = await this.supabase
        .from('subject_statistics')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        logError(error, {
          repository: 'SubjectRepository',
          method: 'findAllWithStatistics'
        })
        throw new DatabaseError('과목 통계를 조회할 수 없습니다', error)
      }

      return (data || []) as SubjectStatistics[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'findAllWithStatistics' })
      throw new DatabaseError('과목 통계를 조회할 수 없습니다')
    }
  }

  /**
   * 과목 생성
   */
  async create(input: CreateSubjectInput): Promise<Subject> {
    try {
      const { data, error } = await this.supabase
        .from('subjects')
        .insert({
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
        logError(error, {
          repository: 'SubjectRepository',
          method: 'create',
          input
        })
        throw new DatabaseError('과목을 생성할 수 없습니다', error)
      }

      return data as Subject
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'create' })
      throw new DatabaseError('과목을 생성할 수 없습니다')
    }
  }

  /**
   * 과목 수정
   */
  async update(subjectId: string, input: UpdateSubjectInput): Promise<Subject> {
    try {
      const updateData: any = { updated_at: new Date().toISOString() }

      if (input.name !== undefined) updateData.name = input.name
      if (input.description !== undefined) updateData.description = input.description
      if (input.code !== undefined) updateData.code = input.code
      if (input.color !== undefined) updateData.color = input.color
      if (input.active !== undefined) updateData.active = input.active
      if (input.sort_order !== undefined) updateData.sort_order = input.sort_order

      const { data, error } = await this.supabase
        .from('subjects')
        .update(updateData)
        .eq('id', subjectId)
        .select()
        .single()

      if (error) {
        logError(error, {
          repository: 'SubjectRepository',
          method: 'update',
          subjectId,
          input
        })
        throw new DatabaseError('과목을 수정할 수 없습니다', error)
      }

      return data as Subject
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'update' })
      throw new DatabaseError('과목을 수정할 수 없습니다')
    }
  }

  /**
   * 과목 삭제 (soft delete)
   */
  async delete(subjectId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('subjects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', subjectId)

      if (error) {
        logError(error, {
          repository: 'SubjectRepository',
          method: 'delete',
          subjectId
        })
        throw new DatabaseError('과목을 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SubjectRepository', method: 'delete' })
      throw new DatabaseError('과목을 삭제할 수 없습니다')
    }
  }
}

// ==================== Factory Functions ====================

/**
 * Client-side용 Repository 생성 (Supabase client 전달 필요)
 */
export function createClientSubjectRepository(supabase: SupabaseClient): SubjectRepository {
  return new SubjectRepository(supabase)
}
