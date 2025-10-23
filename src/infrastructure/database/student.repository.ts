/**
 * Student Repository Implementation
 * 학생 리포지토리 구현 - 인프라 레이어
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type { IStudentRepository, FindStudentOptions, StudentFilters } from '@/domain/repositories/IStudentRepository'
import { Student } from '@/domain/entities/Student'
import { StudentCode } from '@/domain/value-objects/StudentCode'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

export class StudentRepository implements IStudentRepository {
  private dataSource: IDataSource

  /**
   * Constructor
   * @param client - IDataSource 또는 SupabaseClient (하위 호환성)
   */
  constructor(client: IDataSource | SupabaseClient) {
    // IDataSource 타입 체크 (duck typing)
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  async findById(id: string, options?: FindStudentOptions): Promise<Student | null> {
    try {
      let query = this.dataSource
        .from('students')
        .select('*')
        .eq('id', id)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeWithdrawn) {
        query = query.is('withdrawal_date', null)
      }

      const { data, error } = await query.maybeSingle()

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findById', id })
        throw new DatabaseError('학생을 조회할 수 없습니다', error)
      }

      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'findById' })
      throw new DatabaseError('학생을 조회할 수 없습니다')
    }
  }

  async findByIdOrThrow(id: string, options?: FindStudentOptions): Promise<Student> {
    const student = await this.findById(id, options)
    if (!student) {
      throw new NotFoundError('학생')
    }
    return student
  }

  async findByStudentCode(code: StudentCode, tenantId: string): Promise<Student | null> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('student_code', code.getValue())
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findByStudentCode' })
        throw new DatabaseError('학생 코드로 조회할 수 없습니다', error)
      }

      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'findByStudentCode' })
      throw new DatabaseError('학생 코드로 조회할 수 없습니다')
    }
  }

  async findByStudentCodeForKiosk(studentCode: string, tenantId: string): Promise<Student | null> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('student_code', studentCode.toUpperCase())
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findByStudentCodeForKiosk' })
        throw new DatabaseError('학생 코드로 조회할 수 없습니다', error)
      }

      // kiosk_pin을 포함하여 반환 (Use Case에서 검증)
      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'findByStudentCodeForKiosk' })
      throw new DatabaseError('학생 코드로 조회할 수 없습니다')
    }
  }

  async findAll(tenantId: string, filters?: StudentFilters, options?: FindStudentOptions): Promise<Student[]> {
    try {
      let query = this.dataSource
        .from('students')
        .select('*')
        .eq('tenant_id', tenantId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeWithdrawn) {
        query = query.is('withdrawal_date', null)
      }

      if (filters?.grade) {
        query = query.eq('grade', filters.grade)
      }

      if (filters?.school) {
        query = query.eq('school', filters.school)
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,student_code.ilike.%${filters.search}%`)
      }

      if (filters?.commuteMethod) {
        query = query.eq('commute_method', filters.commuteMethod)
      }

      if (filters?.marketingSource) {
        query = query.eq('marketing_source', filters.marketingSource)
      }

      if (filters?.enrollmentDateFrom) {
        query = query.gte('enrollment_date', filters.enrollmentDateFrom)
      }

      if (filters?.enrollmentDateTo) {
        query = query.lte('enrollment_date', filters.enrollmentDateTo)
      }

      const { data, error } = await query.order('student_code')

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findAll' })
        throw new DatabaseError('학생 목록을 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'findAll' })
      throw new DatabaseError('학생 목록을 조회할 수 없습니다')
    }
  }

  async findAllWithDetails(tenantId: string, filters?: StudentFilters, options?: FindStudentOptions): Promise<import('@/domain/repositories/IStudentRepository').StudentWithDetails[]> {
    try {
      console.log('[StudentRepository] findAllWithDetails 시작', { tenantId, filters, options })

      let query = this.dataSource
        .from('students')
        .select(`
          *,
          users (
            name,
            email,
            phone
          ),
          class_enrollments (
            classes (
              name
            )
          )
        `)
        .eq('tenant_id', tenantId)

      if (!options?.includeDeleted) {
        query = query.is('deleted_at', null)
      }

      if (!options?.includeWithdrawn) {
        query = query.is('withdrawal_date', null)
      }

      if (filters?.grade) {
        query = query.eq('grade', filters.grade)
      }

      if (filters?.school) {
        query = query.eq('school', filters.school)
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,student_code.ilike.%${filters.search}%`)
      }

      if (filters?.commuteMethod) {
        query = query.eq('commute_method', filters.commuteMethod)
      }

      if (filters?.marketingSource) {
        query = query.eq('marketing_source', filters.marketingSource)
      }

      if (filters?.enrollmentDateFrom) {
        query = query.gte('enrollment_date', filters.enrollmentDateFrom)
      }

      if (filters?.enrollmentDateTo) {
        query = query.lte('enrollment_date', filters.enrollmentDateTo)
      }

      const { data, error } = await query.order('student_code')

      console.log('[StudentRepository] Query 실행 완료', {
        dataLength: Array.isArray(data) ? data.length : 0,
        hasError: !!error,
        errorMessage: error?.message
      })

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findAllWithDetails' })
        throw new DatabaseError('학생 목록을 조회할 수 없습니다', error)
      }

      const rows = (data as any[] || [])
      return rows.map((row: any) => {
        const student = this.mapToDomain(row)

        // users 데이터 처리 (배열일 수 있음)
        const users = Array.isArray(row.users) ? row.users[0] : row.users
        const userName = users?.name || null
        const userEmail = users?.email || null
        const userPhone = users?.phone || null

        // class_enrollments 데이터 처리
        const classNames = (row.class_enrollments || [])
          .map((enrollment: any) => {
            const classes = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes
            return classes?.name
          })
          .filter(Boolean) as string[]

        return {
          student,
          userName,
          userEmail,
          userPhone,
          classNames,
        }
      })
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'findAllWithDetails' })
      throw new DatabaseError('학생 목록을 조회할 수 없습니다')
    }
  }

  async search(query: string, tenantId: string, limit: number = 20): Promise<Student[]> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${query}%,student_code.ilike.%${query}%`)
        .is('deleted_at', null)
        .limit(limit)

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'search', query })
        throw new DatabaseError('학생을 검색할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'search' })
      throw new DatabaseError('학생을 검색할 수 없습니다')
    }
  }

  async save(student: Student): Promise<Student> {
    try {
      const data = student.toPersistence()

      const { data: savedData, error } = await this.dataSource
        .from('students')
        .upsert(data)
        .select()
        .single()

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'save' })
        throw new DatabaseError('학생을 저장할 수 없습니다', error)
      }

      return this.mapToDomain(savedData)
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'save' })
      throw new DatabaseError('학생을 저장할 수 없습니다')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('students')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'delete', id })
        throw new DatabaseError('학생을 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'StudentRepository', method: 'delete' })
      throw new DatabaseError('학생을 삭제할 수 없습니다')
    }
  }

  async countByGrade(tenantId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('grade')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'countByGrade' })
        throw new DatabaseError('학년별 학생 수를 조회할 수 없습니다', error)
      }

      const counts: Record<string, number> = {}
      const students = (data as any[] || [])
      students.forEach((student: any) => {
        const grade = student.grade || 'unknown'
        counts[grade] = (counts[grade] || 0) + 1
      })

      return counts
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'countByGrade' })
      return {}
    }
  }

  async countBySchool(tenantId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('school')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'countBySchool' })
        throw new DatabaseError('학교별 학생 수를 조회할 수 없습니다', error)
      }

      const counts: Record<string, number> = {}
      const schools = (data as any[] || []); schools.forEach((student: any) => {
        const school = student.school || 'unknown'
        counts[school] = (counts[school] || 0) + 1
      })

      return counts
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'countBySchool' })
      return {}
    }
  }

  async findUniqueGrades(tenantId: string): Promise<string[]> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('grade')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('grade', 'is', null)

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findUniqueGrades' })
        throw new DatabaseError('학년 목록을 조회할 수 없습니다', error)
      }

      const students = (data as any[] || [])
      const uniqueGrades = Array.from(new Set(students.map((s: any) => s.grade).filter(Boolean))) as string[]
      return uniqueGrades.sort()
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'findUniqueGrades' })
      return []
    }
  }

  async findUniqueSchools(tenantId: string): Promise<string[]> {
    try {
      const { data, error } = await this.dataSource
        .from('students')
        .select('school')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('school', 'is', null)

      if (error) {
        logError(error, { repository: 'StudentRepository', method: 'findUniqueSchools' })
        throw new DatabaseError('학교 목록을 조회할 수 없습니다', error)
      }

      const students = (data as any[] || [])
      const uniqueSchools = Array.from(new Set(students.map((s: any) => s.school).filter(Boolean))) as string[]
      return uniqueSchools.sort()
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'SupabaseStudentRepository', method: 'findUniqueSchools' })
      return []
    }
  }

  /**
   * Database row를 Domain Entity로 변환
   */
  private mapToDomain(row: Record<string, unknown>): Student {
    return Student.fromDatabase({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string | null,
      studentCode: StudentCode.create(row.student_code as string),
      name: row.name as string,
      birthDate: row.birth_date ? new Date(row.birth_date as string) : null,
      gender: row.gender as 'male' | 'female' | 'other' | null,
      studentPhone: row.student_phone as string | null,
      profileImageUrl: row.profile_image_url as string | null,
      grade: row.grade as string | null,
      school: row.school as string | null,
      enrollmentDate: new Date(row.enrollment_date as string),
      withdrawalDate: row.withdrawal_date ? new Date(row.withdrawal_date as string) : null,
      emergencyContact: row.emergency_contact as string | null,
      notes: row.notes as string | null,
      commuteMethod: row.commute_method as string | null,
      marketingSource: row.marketing_source as string | null,
      kioskPin: row.kiosk_pin as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
    })
  }
}
