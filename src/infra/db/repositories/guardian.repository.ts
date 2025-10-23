/**
 * Guardian Repository Implementation
 * 보호자 리포지토리 구현
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@core/domain/data-sources/IDataSource'
import { SupabaseDataSource } from '@infra/db/datasource/SupabaseDataSource'
import { Guardian } from '@core/domain/entities/Guardian'
import type { IGuardianRepository, GuardianWithDetails } from '@core/domain/repositories/IGuardianRepository'

export class GuardianRepository implements IGuardianRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: IDataSource | SupabaseClient): client is IDataSource {
    return 'from' in client && typeof (client as any).from === 'function'
  }

  /**
   * 보호자 상세 정보 조회 (users 및 students 포함)
   */
  async findAllWithDetails(tenantId: string): Promise<GuardianWithDetails[]> {
    const { data, error } = await this.dataSource
      .from('guardians')
      .select(`
        *,
        users (
          name,
          email,
          phone
        ),
        student_guardians (
          relation,
          is_primary,
          students (
            id,
            student_code,
            users (
              name
            )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch guardians: ${error.message}`)
    }

    const guardiansData = Array.isArray(data) ? data : []

    return guardiansData.map((row: any) => {
      const guardian = Guardian.fromDatabase(row)

      // Handle users array unwrapping
      const users = Array.isArray(row.users) ? row.users[0] : row.users

      // Handle student_guardians array and extract student info
      const students = (row.student_guardians || []).map((sg: any) => {
        // Handle students array unwrapping
        const student = Array.isArray(sg.students) ? sg.students[0] : sg.students
        // Handle student's users array unwrapping
        const studentUsers = student?.users
          ? Array.isArray(student.users) ? student.users[0] : student.users
          : null

        return {
          id: student?.id || '',
          studentCode: student?.student_code || '',
          name: studentUsers?.name || '',
          relation: sg.relation || null,
          isPrimary: sg.is_primary || null,
        }
      }).filter((s: any) => s.id) // Filter out invalid entries

      return {
        guardian,
        userName: users?.name || null,
        userEmail: users?.email || null,
        userPhone: users?.phone || null,
        students,
      }
    })
  }

  /**
   * 보호자 삭제 (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.dataSource
      .from('guardians')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete guardian: ${error.message}`)
    }
  }
}
