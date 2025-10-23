/**
 * Supabase Data Source Implementation
 * 실제 Supabase 클라이언트를 래핑하는 구현체
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource, IQueryBuilder } from '@core/domain/data-sources/IDataSource'

/**
 * Supabase Query Builder Wrapper
 * Supabase의 QueryBuilder를 IQueryBuilder 인터페이스로 래핑
 */
class SupabaseQueryBuilder<T = any> implements IQueryBuilder<T> {
  constructor(private builder: any) {}

  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.builder = this.builder.select(columns, options)
    return this
  }

  insert(data: Partial<T> | Partial<T>[]): this {
    this.builder = this.builder.insert(data)
    return this
  }

  update(data: Partial<T>): this {
    this.builder = this.builder.update(data)
    return this
  }

  upsert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.builder = this.builder.upsert(data, options)
    return this
  }

  delete(): this {
    this.builder = this.builder.delete()
    return this
  }

  eq(column: string, value: unknown): this {
    this.builder = this.builder.eq(column, value)
    return this
  }

  neq(column: string, value: unknown): this {
    this.builder = this.builder.neq(column, value)
    return this
  }

  gt(column: string, value: unknown): this {
    this.builder = this.builder.gt(column, value)
    return this
  }

  gte(column: string, value: unknown): this {
    this.builder = this.builder.gte(column, value)
    return this
  }

  lt(column: string, value: unknown): this {
    this.builder = this.builder.lt(column, value)
    return this
  }

  lte(column: string, value: unknown): this {
    this.builder = this.builder.lte(column, value)
    return this
  }

  in(column: string, values: unknown[]): this {
    this.builder = this.builder.in(column, values)
    return this
  }

  is(column: string, value: unknown): this {
    this.builder = this.builder.is(column, value)
    return this
  }

  not(column: string, operator: string, value: unknown): this {
    this.builder = this.builder.not(column, operator, value)
    return this
  }

  or(query: string): this {
    this.builder = this.builder.or(query)
    return this
  }

  like(column: string, pattern: string): this {
    this.builder = this.builder.like(column, pattern)
    return this
  }

  ilike(column: string, pattern: string): this {
    this.builder = this.builder.ilike(column, pattern)
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.builder = this.builder.order(column, options)
    return this
  }

  limit(count: number): this {
    this.builder = this.builder.limit(count)
    return this
  }

  range(from: number, to: number): this {
    this.builder = this.builder.range(from, to)
    return this
  }

  async single<R = T>(): Promise<{ data: R | null; error: Error | null }> {
    return await this.builder.single()
  }

  async maybeSingle<R = T>(): Promise<{ data: R | null; error: Error | null }> {
    return await this.builder.maybeSingle()
  }

  then<R = T[]>(
    onfulfilled?: ((value: { data: R | null; error: Error | null }) => any) | null,
    onrejected?: ((reason: any) => any) | null
  ): Promise<any> {
    return this.builder.then(onfulfilled, onrejected)
  }
}

/**
 * Supabase Data Source
 * 실제 Supabase 클라이언트를 IDataSource로 래핑
 */
export class SupabaseDataSource implements IDataSource {
  constructor(private client: SupabaseClient) {}

  from<T = any>(table: string): IQueryBuilder<T> {
    const builder = this.client.from(table)
    return new SupabaseQueryBuilder<T>(builder)
  }

  async rpc<T = any>(
    fn: string,
    params?: object
  ): Promise<{ data: T | null; error: Error | null }> {
    return await this.client.rpc(fn, params)
  }

  get auth() {
    return {
      getUser: async () => await this.client.auth.getUser(),
      signOut: async () => await this.client.auth.signOut(),
      signUp: async (credentials: {
        email: string
        password: string
        options?: { emailRedirectTo?: string; data?: object }
      }) => await this.client.auth.signUp(credentials),
      signInWithPassword: async (credentials: {
        email: string
        password: string
      }) => await this.client.auth.signInWithPassword(credentials),
      signInWithOAuth: async (options: {
        provider: string
        options?: { redirectTo?: string; scopes?: string }
      }) => await this.client.auth.signInWithOAuth(options as any),
      resetPasswordForEmail: async (
        email: string,
        options?: { redirectTo?: string }
      ) => await this.client.auth.resetPasswordForEmail(email, options),
      updateUser: async (attributes: {
        email?: string
        password?: string
        data?: object
      }) => await this.client.auth.updateUser(attributes),
    }
  }

  /**
   * 원본 Supabase 클라이언트 반환
   * 특수한 경우에만 사용 (예: Storage, Realtime)
   */
  getClient(): SupabaseClient {
    return this.client
  }
}
