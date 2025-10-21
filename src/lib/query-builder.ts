/**
 * Query builder utilities for database abstraction
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type { QueryParams, PaginationMeta } from '@/types/common'
import { SupabaseDataSource } from '@/infrastructure/data-sources/SupabaseDataSource'

export class QueryBuilder<T> {
  private dataSource: IDataSource

  /**
   * Constructor
   * @param client - IDataSource 또는 SupabaseClient (하위 호환성)
   * @param tableName - 테이블 이름
   */
  constructor(
    client: IDataSource | SupabaseClient,
    private tableName: string
  ) {
    // IDataSource 타입 체크 (duck typing)
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  /**
   * Build a paginated query with filters and sorting
   */
  async paginate(params: QueryParams): Promise<{
    data: T[]
    meta: PaginationMeta
  }> {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'desc',
      search,
      status,
      ...filters
    } = params

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Start query
    let query = this.dataSource.from(this.tableName).select('*', { count: 'exact' }) as any

    // Apply search if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%`)
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value)
      }
    })

    // Apply soft delete filter (only non-deleted records)
    query = query.is('deleted_at', null)

    // Apply sorting and pagination
    query = query.order(sort_by, { ascending: sort_order === 'asc' })
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: (data as T[]) || [],
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.dataSource
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data as T | null
  }

  /**
   * Find records by field
   */
  async findBy(field: string, value: unknown): Promise<T[]> {
    const { data, error } = await this.dataSource
      .from(this.tableName)
      .select('*')
      .eq(field, value)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    return (data as T[]) || []
  }

  /**
   * Create a new record
   */
  async create(record: Partial<T>): Promise<T> {
    const { data, error } = await this.dataSource
      .from(this.tableName)
      .insert(record)
      .select()
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error(`Failed to create record in ${this.tableName}`)
    }

    return data as T
  }

  /**
   * Update a record
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.dataSource
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error(`Failed to update record in ${this.tableName}`)
    }

    return data as T
  }

  /**
   * Soft delete a record
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.dataSource
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw error
    }
  }

  /**
   * Hard delete a record
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.dataSource.from(this.tableName).delete().eq('id', id)

    if (error) {
      throw error
    }
  }

  /**
   * Count records
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    let query = this.dataSource
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null) as any

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }

    const result = await query
    const { count, error } = result as { count?: number | null; error: Error | null }

    if (error) {
      throw error
    }

    return count || 0
  }
}
