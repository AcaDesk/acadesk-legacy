/**
 * Supabase TodoTemplate Repository
 * TodoTemplate 리포지토리 Supabase 구현체 - Infrastructure Layer
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ITodoTemplateRepository } from '@/domain/repositories/ITodoTemplateRepository'
import { TodoTemplate } from '@/domain/entities/TodoTemplate'
import { Priority } from '@/domain/value-objects/Priority'
import { DatabaseError } from '@/lib/error-types'

export class TodoTemplateRepository implements ITodoTemplateRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<TodoTemplate | null> {
    const { data, error } = await this.supabase
      .from('todo_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('템플릿을 조회할 수 없습니다', error)
    }

    if (!data) return null

    return this.mapToDomain(data)
  }

  async findAllActive(tenantId: string): Promise<TodoTemplate[]> {
    const { data, error } = await this.supabase
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('subject', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      throw new DatabaseError('템플릿 목록을 조회할 수 없습니다', error)
    }

    return (data || []).map(this.mapToDomain)
  }

  async findAll(tenantId: string): Promise<TodoTemplate[]> {
    const { data, error } = await this.supabase
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('subject', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      throw new DatabaseError('템플릿 목록을 조회할 수 없습니다', error)
    }

    return (data || []).map(this.mapToDomain)
  }

  async findBySubject(tenantId: string, subject: string): Promise<TodoTemplate[]> {
    const { data, error } = await this.supabase
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('subject', subject)
      .eq('active', true)
      .order('title', { ascending: true })

    if (error) {
      throw new DatabaseError('과목별 템플릿을 조회할 수 없습니다', error)
    }

    return (data || []).map(this.mapToDomain)
  }

  async save(template: TodoTemplate): Promise<TodoTemplate> {
    const data = template.toPersistence()

    const { data: saved, error } = await this.supabase
      .from('todo_templates')
      .upsert(data)
      .select()
      .single()

    if (error) {
      throw new DatabaseError('템플릿을 저장할 수 없습니다', error)
    }

    return this.mapToDomain(saved)
  }

  async delete(id: string): Promise<void> {
    // 소프트 삭제: active = false로 업데이트
    const { error } = await this.supabase
      .from('todo_templates')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new DatabaseError('템플릿을 삭제할 수 없습니다', error)
    }
  }

  private mapToDomain(row: Record<string, unknown>): TodoTemplate {
    return TodoTemplate.fromDatabase({
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      subject: row.subject,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      priority: Priority.fromString(row.priority),
      active: row.active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  }
}
