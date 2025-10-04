/**
 * Student repository
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Student } from '@/types/database'
import type { UUID } from '@/types/common'
import { BaseRepository } from './base.repository'
import { DatabaseError } from '@/lib/errors'

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

export class StudentRepository extends BaseRepository<Student> {
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
        console.error('Error fetching student with guardians:', error);
        throw error;
      }

      if (!data) {
        throw new Error(`Student with id ${id} not found`);
      }

      // Transform the nested data
      const guardians = data.student_guardians?.map((sg: any) => ({
        guardian_id: sg.guardians.id,
        name: sg.guardians.users?.name || '',
        email: sg.guardians.users?.email || '',
        phone: sg.guardians.users?.phone || '',
        relationship: sg.guardians.relationship || '',
        is_primary: sg.is_primary,
      }))

      return {
        ...data,
        guardians,
      } as StudentWithGuardians
    } catch (error) {
      throw new DatabaseError('Failed to fetch student with guardians', error)
    }
  }

  /**
   * Find students by tenant
   */
  async findByTenant(tenantId: UUID): Promise<Student[]> {
    return this.findBy('tenant_id', tenantId)
  }

  /**
   * Search students by name (searches in users table via user_id)
   */
  async search(query: string, tenantId?: UUID): Promise<Student[]> {
    try {
      let searchQuery = this.supabase
        .from('students')
        .select(`
          *,
          users!inner (
            name
          )
        `)
        .ilike('users.name', `%${query}%`)
        .is('deleted_at', null)
        .limit(20)

      if (tenantId) {
        searchQuery = searchQuery.eq('tenant_id', tenantId)
      }

      const { data, error } = await searchQuery

      if (error) throw error
      return (data as Student[]) || []
    } catch (error) {
      throw new DatabaseError('Failed to search students', error)
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

      if (error) throw error

      const counts: Record<string, number> = {}
      data.forEach((student) => {
        const grade = student.grade || 'unknown'
        counts[grade] = (counts[grade] || 0) + 1
      })

      return counts
    } catch (error) {
      throw new DatabaseError('Failed to count students by grade', error)
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

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to add guardian to student', error)
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

      if (error) throw error
    } catch (error) {
      throw new DatabaseError('Failed to remove guardian from student', error)
    }
  }
}
