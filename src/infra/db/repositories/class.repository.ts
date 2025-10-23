/**
 * Class Repository Implementation
 * Supabase를 통한 수업 데이터 접근 구현
 */

import { Class } from '@core/domain/entities/Class'
import { IClassRepository, ClassWithDetails } from '@core/domain/repositories/IClassRepository'
import { IDataSource } from '@core/domain/data-sources/IDataSource'
import { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseDataSource } from '@infra/db/datasource/SupabaseDataSource'

export class ClassRepository implements IClassRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: IDataSource | SupabaseClient): client is IDataSource {
    return 'from' in client && typeof client.from === 'function'
  }

  async findById(id: string): Promise<Class | null> {
    const { data, error } = await this.dataSource
      .from('classes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return Class.fromDatabase(data)
  }

  async findAllWithDetails(): Promise<ClassWithDetails[]> {
    const { data, error } = await this.dataSource
      .from('classes')
      .select(`
        *,
        users!classes_instructor_id_fkey (
          name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data) return []

    // 데이터가 배열인지 확인
    const classesData = Array.isArray(data) ? data : []

    // 각 수업별로 수강생 수 조회
    const classesWithDetails = await Promise.all(
      classesData.map(async (classData: Record<string, unknown>) => {
        const { count, error: countError } = await this.dataSource
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classData.id)
          .eq('status', 'active')

        if (countError) {
          console.error('Error counting students:', countError)
        }

        const classEntity = Class.fromDatabase(classData)
        const instructorName = (classData.users as { name: string } | null)?.name || null

        return {
          class: classEntity,
          instructorName,
          studentCount: count || 0,
        }
      })
    )

    return classesWithDetails
  }

  async create(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): Promise<Class> {
    const { data, error } = await this.dataSource
      .from('classes')
      .insert({
        tenant_id: classData.tenantId,
        name: classData.name,
        description: classData.description,
        instructor_id: classData.instructorId,
        subject: classData.subject,
        subject_id: classData.subjectId,
        grade_level: classData.gradeLevel,
        capacity: classData.capacity,
        schedule: classData.schedule,
        room: classData.room,
        status: classData.status,
        active: classData.active,
        meta: classData.meta,
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create class')

    return Class.fromDatabase(data)
  }

  async update(id: string, classData: Partial<Class>): Promise<Class> {
    const updateData: Record<string, unknown> = {}

    if (classData.name !== undefined) updateData.name = classData.name
    if (classData.description !== undefined) updateData.description = classData.description
    if (classData.instructorId !== undefined) updateData.instructor_id = classData.instructorId
    if (classData.subject !== undefined) updateData.subject = classData.subject
    if (classData.subjectId !== undefined) updateData.subject_id = classData.subjectId
    if (classData.gradeLevel !== undefined) updateData.grade_level = classData.gradeLevel
    if (classData.capacity !== undefined) updateData.capacity = classData.capacity
    if (classData.schedule !== undefined) updateData.schedule = classData.schedule
    if (classData.room !== undefined) updateData.room = classData.room
    if (classData.status !== undefined) updateData.status = classData.status
    if (classData.active !== undefined) updateData.active = classData.active
    if (classData.meta !== undefined) updateData.meta = classData.meta

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await this.dataSource
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to update class')

    return Class.fromDatabase(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.dataSource
      .from('classes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }
}
