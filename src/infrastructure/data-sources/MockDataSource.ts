/**
 * Mock Data Source Implementation
 * 테스트용 In-Memory 데이터 소스
 */

import type { IDataSource, IQueryBuilder } from '@/domain/data-sources/IDataSource'

/**
 * Mock Query Builder
 * 테스트를 위한 간단한 In-Memory Query Builder
 */
class MockQueryBuilder<T = any> implements IQueryBuilder<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _select: string = '*' // Reserved for future column selection feature
  private _data: Partial<T> | Partial<T>[] | null = null
  private _operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private _filters: Array<{ type: string; column: string; value: unknown }> = []
  private _orderBy: { column: string; ascending: boolean } | null = null
  private _limitValue: number | null = null
  private _rangeValue: { from: number; to: number } | null = null

  constructor(
    private tableName: string,
    private store: Map<string, Map<string, any>>
  ) {}

  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this._operation = 'select'
    this._select = columns || '*'
    // Note: count and head options are ignored in mock implementation
    return this
  }

  insert(data: Partial<T> | Partial<T>[]): this {
    this._operation = 'insert'
    this._data = data
    return this
  }

  update(data: Partial<T>): this {
    this._operation = 'update'
    this._data = data
    return this
  }

  upsert(data: Partial<T> | Partial<T>[]): this {
    this._operation = 'upsert'
    this._data = data
    return this
  }

  delete(): this {
    this._operation = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this._filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: unknown): this {
    this._filters.push({ type: 'neq', column, value })
    return this
  }

  gt(column: string, value: unknown): this {
    this._filters.push({ type: 'gt', column, value })
    return this
  }

  gte(column: string, value: unknown): this {
    this._filters.push({ type: 'gte', column, value })
    return this
  }

  lt(column: string, value: unknown): this {
    this._filters.push({ type: 'lt', column, value })
    return this
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ type: 'lte', column, value })
    return this
  }

  in(column: string, values: unknown[]): this {
    this._filters.push({ type: 'in', column, value: values })
    return this
  }

  is(column: string, value: unknown): this {
    this._filters.push({ type: 'is', column, value })
    return this
  }

  not(column: string, operator: string, value: unknown): this {
    this._filters.push({ type: 'not', column, value: { operator, value } })
    return this
  }

  or(query: string): this {
    this._filters.push({ type: 'or', column: '', value: query })
    return this
  }

  like(column: string, pattern: string): this {
    this._filters.push({ type: 'like', column, value: pattern })
    return this
  }

  ilike(column: string, pattern: string): this {
    this._filters.push({ type: 'ilike', column, value: pattern })
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this._orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number): this {
    this._limitValue = count
    return this
  }

  range(from: number, to: number): this {
    this._rangeValue = { from, to }
    return this
  }

  async single<R = T>(): Promise<{ data: R | null; error: Error | null }> {
    const result = await this.execute()
    if (result.error) return { data: null, error: result.error }
    const data = result.data as R[]
    if (data.length === 0) return { data: null, error: null }
    if (data.length > 1) {
      return { data: null, error: new Error('Multiple rows returned') }
    }
    return { data: data[0], error: null }
  }

  async maybeSingle<R = T>(): Promise<{ data: R | null; error: Error | null }> {
    const result = await this.execute()
    if (result.error) return { data: null, error: result.error }
    const data = result.data as R[]
    return { data: data[0] || null, error: null }
  }

  async then<R = T[]>(
    onfulfilled?: ((value: { data: R | null; error: Error | null }) => any) | null,
    onrejected?: ((reason: any) => any) | null
  ): Promise<any> {
    try {
      const result = await this.execute()
      return onfulfilled
        ? onfulfilled({ data: result.data as R, error: result.error })
        : { data: result.data as R, error: result.error }
    } catch (error) {
      return onrejected ? onrejected(error) : Promise.reject(error)
    }
  }

  private async execute(): Promise<{ data: any | null; error: Error | null }> {
    try {
      const table = this.store.get(this.tableName) || new Map()

      switch (this._operation) {
        case 'select':
          return this.executeSelect(table)
        case 'insert':
          return this.executeInsert(table)
        case 'update':
          return this.executeUpdate(table)
        case 'upsert':
          return this.executeUpsert(table)
        case 'delete':
          return this.executeDelete(table)
        default:
          return { data: null, error: new Error('Unknown operation') }
      }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
    }
  }

  private executeSelect(table: Map<string, any>): { data: any[]; error: null } {
    let results = Array.from(table.values())

    // Apply filters
    results = results.filter((row) => this.matchesFilters(row))

    // Apply ordering
    if (this._orderBy) {
      results.sort((a, b) => {
        const aVal = a[this._orderBy!.column]
        const bVal = b[this._orderBy!.column]
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return this._orderBy!.ascending ? comparison : -comparison
      })
    }

    // Apply range/limit
    if (this._rangeValue) {
      results = results.slice(this._rangeValue.from, this._rangeValue.to + 1)
    } else if (this._limitValue) {
      results = results.slice(0, this._limitValue)
    }

    return { data: results, error: null }
  }

  private executeInsert(table: Map<string, any>): { data: any[]; error: null } {
    const items = Array.isArray(this._data) ? this._data : [this._data]
    const inserted = items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const id = (item as any)?.id || this.generateId()
      const record = { ...item, id, created_at: new Date().toISOString() }
      table.set(id, record)
      this.store.set(this.tableName, table)
      return record
    })
    return { data: inserted, error: null }
  }

  private executeUpdate(table: Map<string, any>): { data: any[]; error: null } {
    const updated: any[] = []
    table.forEach((row, id) => {
      if (this.matchesFilters(row)) {
        const updatedRow = { ...row, ...this._data, updated_at: new Date().toISOString() }
        table.set(id, updatedRow)
        updated.push(updatedRow)
      }
    })
    this.store.set(this.tableName, table)
    return { data: updated, error: null }
  }

  private executeUpsert(table: Map<string, any>): { data: any[]; error: null } {
    const items = Array.isArray(this._data) ? this._data : [this._data]
    const upserted = items.map((item) => {
      const id = (item as any)?.id || this.generateId()
      const existing = table.get(id)
      const record = existing
        ? { ...existing, ...item, updated_at: new Date().toISOString() }
        : { ...item, id, created_at: new Date().toISOString() }
      table.set(id, record)
      this.store.set(this.tableName, table)
      return record
    })
    return { data: upserted, error: null }
  }

  private executeDelete(table: Map<string, any>): { data: null; error: null } {
    table.forEach((row, id) => {
      if (this.matchesFilters(row)) {
        table.delete(id)
      }
    })
    this.store.set(this.tableName, table)
    return { data: null, error: null }
  }

  private matchesFilters(row: any): boolean {
    return this._filters.every((filter) => {
      const rowValue = row[filter.column]
      switch (filter.type) {
        case 'eq':
          return rowValue === filter.value
        case 'neq':
          return rowValue !== filter.value
        case 'gt':
          return rowValue > (filter.value as any)
        case 'gte':
          return rowValue >= (filter.value as any)
        case 'lt':
          return rowValue < (filter.value as any)
        case 'lte':
          return rowValue <= (filter.value as any)
        case 'in':
          return (filter.value as unknown[]).includes(rowValue)
        case 'is':
          return filter.value === null ? rowValue === null : rowValue === filter.value
        case 'like':
        case 'ilike':
          const pattern = String(filter.value).replace(/%/g, '.*')
          const regex = new RegExp(pattern, filter.type === 'ilike' ? 'i' : '')
          return regex.test(String(rowValue))
        default:
          return true
      }
    })
  }

  private generateId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }
}

/**
 * Mock Data Source
 * 테스트를 위한 In-Memory 데이터 소스
 */
export class MockDataSource implements IDataSource {
  private store: Map<string, Map<string, any>> = new Map()

  from<T = any>(table: string): IQueryBuilder<T> {
    return new MockQueryBuilder<T>(table, this.store)
  }

  async rpc<T = any>(
    fn: string,
    params?: object
  ): Promise<{ data: T | null; error: Error | null }> {
    // Mock RPC - 테스트에서 필요시 구현
    console.warn(`MockDataSource.rpc('${fn}', ${JSON.stringify(params)}) called but not implemented`)
    return { data: null, error: new Error('RPC not implemented in MockDataSource') }
  }

  get auth() {
    return {
      getUser: async () => ({
        data: { user: { id: 'mock-user-id', email: 'mock@example.com' } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      signUp: async (credentials: {
        email: string
        password: string
        options?: { emailRedirectTo?: string; data?: object }
      }) => ({
        data: {
          user: { id: 'mock-user-id', email: credentials.email },
          session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
        },
        error: null,
      }),
      signInWithPassword: async (credentials: {
        email: string
        password: string
      }) => ({
        data: {
          user: { id: 'mock-user-id', email: credentials.email },
          session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
        },
        error: null,
      }),
      signInWithOAuth: async (options: {
        provider: string
        options?: { redirectTo?: string; scopes?: string }
      }) => ({
        data: { url: 'https://mock-oauth-url.com', provider: options.provider },
        error: null,
      }),
      resetPasswordForEmail: async (
        email: string,
        options?: { redirectTo?: string }
      ) => ({
        data: {},
        error: null,
      }),
      updateUser: async (attributes: {
        email?: string
        password?: string
        data?: object
      }) => ({
        data: { user: { id: 'mock-user-id', email: attributes.email || 'mock@example.com' } },
        error: null,
      }),
    }
  }

  /**
   * 테스트용 데이터 주입
   */
  seed(tableName: string, data: any[]): void {
    const table = new Map(data.map((item) => [item.id, item]))
    this.store.set(tableName, table)
  }

  /**
   * 테스트용 데이터 초기화
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * 특정 테이블 데이터 조회 (테스트용)
   */
  getTable(tableName: string): any[] {
    const table = this.store.get(tableName)
    return table ? Array.from(table.values()) : []
  }
}
