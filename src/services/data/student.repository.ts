/**
 * Student Repository
 *
 * 학생 데이터 접근 레이어 - 순수 CRUD 작업만 수행
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Student } from '@/types/database'
import type { UUID } from '@/types/common'
import { BaseRepository } from './base.repository'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export interface StudentWithGuardians extends Student {
  guardians?: Array<{
    guardian_id: string
    name: string
    phone?: string
    email?: string
    relationship?: string
    is_primary: boolean
  }>
}

export class StudentRepository extends BaseRepository<Student & Record<string, unknown>> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'students')
  }

  /**
   * Find student with guardians
   */
  async findByIdWithGuardians(id: UUID): Promise<StudentWithGuardians> {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select(`
          *,
          student_guardians (
            is_primary,
            guardians (
              id,
              relationship,
              users (
                id,
                name,
                email,
                phone
              )
            )
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'findByIdWithGuardians',
          studentId: id
        })
        throw new DatabaseError('보호자 정보를 포함한 학생을 조회할 수 없습니다', error)
      }

      if (!data) {
        throw new NotFoundError('학생')
      }

      // Transform the nested data
      interface StudentGuardianJoin {
        is_primary: boolean
        guardians: {
          id: string
          relationship?: string | null
          users?: {
            id: string
            name: string
            email?: string | null
            phone?: string | null
          } | null
        } | null
      }

      const guardians = (data.student_guardians as unknown as StudentGuardianJoin[] | undefined)?.map((sg) => ({
        guardian_id: sg.guardians?.id || '',
        name: sg.guardians?.users?.name || '',
        email: sg.guardians?.users?.email || '',
        phone: sg.guardians?.users?.phone || '',
        relationship: sg.guardians?.relationship || '',
        is_primary: sg.is_primary,
      }))

      return {
        ...data,
        guardians,
      } as StudentWithGuardians
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error
      logError(error, { repository: 'StudentRepository', method: 'findByIdWithGuardians' })
      throw new DatabaseError('보호자 정보를 포함한 학생을 조회할 수 없습니다')
    }
  }

  /**
   * Find students by tenant
   */
  async findByTenant(tenantId: UUID): Promise<Student[]> {
    return this.findBy('tenant_id', tenantId)
  }

  /**
   * Search students by name or student code
   */
  async search(query: string, tenantId?: UUID): Promise<Student[]> {
    try {
      let searchQuery = this.supabase
        .from('students')
        .select('*')
        .or(`name.ilike.%${query}%,student_code.ilike.%${query}%`)
        .is('deleted_at', null)
        .limit(20)

      if (tenantId) {
        searchQuery = searchQuery.eq('tenant_id', tenantId)
      }

      const { data, error } = await searchQuery

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'search',
          query,
          tenantId
        })
        throw new DatabaseError('학생을 검색할 수 없습니다', error)
      }

      return (data as Student[]) || []
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'search' })
      throw new DatabaseError('학생을 검색할 수 없습니다')
    }
  }

  /**
   * Get student count by grade
   */
  async countByGrade(tenantId: UUID): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('grade')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'countByGrade',
          tenantId
        })
        throw new DatabaseError('학년별 학생 수를 조회할 수 없습니다', error)
      }

      const counts: Record<string, number> = {}
      data.forEach((student) => {
        const grade = student.grade || 'unknown'
        counts[grade] = (counts[grade] || 0) + 1
      })

      return counts
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'countByGrade' })
      throw new DatabaseError('학년별 학생 수를 조회할 수 없습니다')
    }
  }

  /**
   * Add guardian to student
   */
  async addGuardian(
    tenantId: UUID,
    studentId: UUID,
    guardianId: UUID,
    isPrimary = false
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('student_guardians')
        .insert({
          tenant_id: tenantId,
          student_id: studentId,
          guardian_id: guardianId,
          is_primary: isPrimary,
        })

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'addGuardian',
          tenantId,
          studentId,
          guardianId
        })
        throw new DatabaseError('보호자를 추가할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'addGuardian' })
      throw new DatabaseError('보호자를 추가할 수 없습니다')
    }
  }

  /**
   * Remove guardian from student
   */
  async removeGuardian(studentId: UUID, guardianId: UUID): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('student_guardians')
        .delete()
        .eq('student_id', studentId)
        .eq('guardian_id', guardianId)

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'removeGuardian',
          studentId,
          guardianId
        })
        throw new DatabaseError('보호자를 제거할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'removeGuardian' })
      throw new DatabaseError('보호자를 제거할 수 없습니다')
    }
  }

  /**
   * 고유한 학년 목록 조회
   */
  async findUniqueGrades(tenantId?: UUID): Promise<string[]> {
    try {
      let query = this.supabase
        .from('students')
        .select('grade')
        .is('deleted_at', null)
        .not('grade', 'is', null)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'findUniqueGrades',
          tenantId
        })
        throw new DatabaseError('학년 목록을 조회할 수 없습니다', error)
      }

      const uniqueGrades = Array.from(
        new Set(data.map(s => s.grade).filter(Boolean))
      ) as string[]

      return uniqueGrades.sort()
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'findUniqueGrades' })
      return []
    }
  }

  /**
   * 고유한 학교 목록 조회
   */
  async findUniqueSchools(tenantId?: UUID): Promise<string[]> {
    try {
      let query = this.supabase
        .from('students')
        .select('school')
        .is('deleted_at', null)
        .not('school', 'is', null)

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data, error } = await query

      if (error) {
        logError(error, {
          repository: 'StudentRepository',
          method: 'findUniqueSchools',
          tenantId
        })
        throw new DatabaseError('학교 목록을 조회할 수 없습니다', error)
      }

      const uniqueSchools = Array.from(
        new Set(data.map(s => s.school).filter(Boolean))
      ) as string[]

      return uniqueSchools.sort()
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'findUniqueSchools' })
      return []
    }
  }
}
