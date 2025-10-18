/**
 * Supabase Exam Repository Implementation
 * 시험 리포지토리의 Supabase 구현 - 인프라 레이어
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IExamRepository, ExamFilters } from '@/domain/repositories/IExamRepository'
import { Exam } from '@/domain/entities/Exam'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export class SupabaseExamRepository implements IExamRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Exam | null> {
    try {
      const { data, error } = await this.supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findById', id })
        throw new DatabaseError('시험을 조회할 수 없습니다', error)
      }

      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findById' })
      throw new DatabaseError('시험을 조회할 수 없습니다')
    }
  }

  async findByIdOrThrow(id: string): Promise<Exam> {
    const exam = await this.findById(id)
    if (!exam) {
      throw new NotFoundError('시험')
    }
    return exam
  }

  async findAll(tenantId: string, filters?: ExamFilters): Promise<Exam[]> {
    try {
      let query = this.supabase
        .from('exams')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('exam_date', { ascending: false })

      if (filters?.classId) {
        query = query.eq('class_id', filters.classId)
      }

      if (filters?.categoryCode) {
        query = query.eq('category_code', filters.categoryCode)
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findAll' })
        throw new DatabaseError('시험 목록을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findAll' })
      throw new DatabaseError('시험 목록을 조회할 수 없습니다')
    }
  }

  async findByClassId(classId: string): Promise<Exam[]> {
    try {
      const { data, error } = await this.supabase
        .from('exams')
        .select('*')
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('exam_date', { ascending: false })

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findByClassId' })
        throw new DatabaseError('클래스 시험을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findByClassId' })
      throw new DatabaseError('클래스 시험을 조회할 수 없습니다')
    }
  }

  async findByCategoryCode(tenantId: string, categoryCode: string): Promise<Exam[]> {
    try {
      const { data, error } = await this.supabase
        .from('exams')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('category_code', categoryCode)
        .is('deleted_at', null)
        .order('exam_date', { ascending: false })

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findByCategoryCode' })
        throw new DatabaseError('카테고리별 시험을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findByCategoryCode' })
      throw new DatabaseError('카테고리별 시험을 조회할 수 없습니다')
    }
  }

  async findUpcoming(tenantId: string, days: number = 7): Promise<Exam[]> {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + days)

      const { data, error } = await this.supabase
        .from('exams')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('exam_date', today.toISOString())
        .lte('exam_date', futureDate.toISOString())
        .is('deleted_at', null)
        .order('exam_date', { ascending: true })

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findUpcoming' })
        throw new DatabaseError('임박한 시험을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findUpcoming' })
      throw new DatabaseError('임박한 시험을 조회할 수 없습니다')
    }
  }

  async findPast(tenantId: string, limit: number = 10): Promise<Exam[]> {
    try {
      const today = new Date()

      const { data, error } = await this.supabase
        .from('exams')
        .select('*')
        .eq('tenant_id', tenantId)
        .lt('exam_date', today.toISOString())
        .is('deleted_at', null)
        .order('exam_date', { ascending: false })
        .limit(limit)

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findPast' })
        throw new DatabaseError('지난 시험을 조회할 수 없습니다', error)
      }

      return (data || []).map(row => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findPast' })
      throw new DatabaseError('지난 시험을 조회할 수 없습니다')
    }
  }

  async save(exam: Exam): Promise<Exam> {
    try {
      const data = exam.toPersistence()

      const { data: savedData, error } = await this.supabase
        .from('exams')
        .upsert(data)
        .select()
        .single()

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'save' })
        throw new DatabaseError('시험을 저장할 수 없습니다', error)
      }

      return this.mapToDomain(savedData)
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'save' })
      throw new DatabaseError('시험을 저장할 수 없습니다')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('exams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'delete', id })
        throw new DatabaseError('시험을 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'delete' })
      throw new DatabaseError('시험을 삭제할 수 없습니다')
    }
  }

  async findUniqueCategories(tenantId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('exams')
        .select('category_code')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (error) {
        logError(error, { repository: 'SupabaseExamRepository', method: 'findUniqueCategories' })
        throw new DatabaseError('카테고리 목록을 조회할 수 없습니다', error)
      }

      const uniqueCategories = Array.from(new Set(data.map(d => d.category_code).filter(Boolean))) as string[]
      return uniqueCategories.sort()
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseExamRepository', method: 'findUniqueCategories' })
      return []
    }
  }

  /**
   * Database row를 Domain Entity로 변환
   */
  private mapToDomain(row: Record<string, unknown>): Exam {
    return Exam.fromDatabase({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      classId: row.class_id as string | null,
      name: row.name as string,
      categoryCode: row.category_code as string,
      examDate: row.exam_date ? new Date(row.exam_date as string) : null,
      totalQuestions: row.total_questions as number | null,
      description: row.description as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
    })
  }
}
