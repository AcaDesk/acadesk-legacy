/**
 * Supabase TodoTemplate Repository
 * TodoTemplate 리포지토리 Supabase 구현체 - Infrastructure Layer
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@core/domain/data-sources/IDataSource'
import type { ITodoTemplateRepository } from '@core/domain/repositories/ITodoTemplateRepository'
import { TodoTemplate } from '@core/domain/entities/TodoTemplate'
import { Priority } from '@core/domain/value-objects/Priority'
import { DatabaseError } from '@/lib/error-types'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

export class TodoTemplateRepository implements ITodoTemplateRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  async findById(id: string): Promise<TodoTemplate | null> {
    const { data, error } = await this.dataSource
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
    const { data, error } = await this.dataSource
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('subject', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      throw new DatabaseError('템플릿 목록을 조회할 수 없습니다', error)
    }

    return (data as any[] || []).map((row: any) => this.mapToDomain(row))
  }

  async findAll(tenantId: string): Promise<TodoTemplate[]> {
    const { data, error } = await this.dataSource
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('subject', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      throw new DatabaseError('템플릿 목록을 조회할 수 없습니다', error)
    }

    return (data as any[] || []).map((row: any) => this.mapToDomain(row))
  }

  async findBySubject(tenantId: string, subject: string): Promise<TodoTemplate[]> {
    const { data, error } = await this.dataSource
      .from('todo_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('subject', subject)
      .eq('active', true)
      .order('title', { ascending: true })

    if (error) {
      throw new DatabaseError('과목별 템플릿을 조회할 수 없습니다', error)
    }

    return (data as any[] || []).map((row: any) => this.mapToDomain(row))
  }

  async save(template: TodoTemplate): Promise<TodoTemplate> {
    const data = template.toPersistence()

    const { data: saved, error } = await this.dataSource
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
    const { error } = await this.dataSource
      .from('todo_templates')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new DatabaseError('템플릿을 삭제할 수 없습니다', error)
    }
  }

  private mapToDomain(row: Record<string, unknown>): TodoTemplate {
    return TodoTemplate.fromDatabase({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      description: row.description as string | null,
      subject: row.subject as string | null,
      estimatedDurationMinutes: row.estimated_duration_minutes as number | null,
      priority: Priority.fromString(row.priority as string),
      active: row.active as boolean,
      createdAt: new Date(row.created_at as string | number | Date),
      updatedAt: new Date(row.updated_at as string | number | Date),
    })
  }
}
