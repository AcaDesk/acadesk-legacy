/**
 * Data Source Interface
 * 데이터베이스 클라이언트를 추상화하는 인터페이스
 *
 * Supabase, Mock, In-Memory 등 다양한 구현체를 지원합니다.
 */

/**
 * Query Builder Interface
 * Supabase의 Query Builder를 추상화
 */
export interface IQueryBuilder<T = any> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this
  insert(data: Partial<T> | Partial<T>[]): this
  update(data: Partial<T>): this
  upsert(data: Partial<T> | Partial<T>[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this
  delete(): this
  eq(column: string, value: unknown): this
  neq(column: string, value: unknown): this
  gt(column: string, value: unknown): this
  gte(column: string, value: unknown): this
  lt(column: string, value: unknown): this
  lte(column: string, value: unknown): this
  in(column: string, values: unknown[]): this
  is(column: string, value: unknown): this
  not(column: string, operator: string, value: unknown): this
  or(query: string): this
  like(column: string, pattern: string): this
  ilike(column: string, pattern: string): this
  order(column: string, options?: { ascending?: boolean }): this
  limit(count: number): this
  range(from: number, to: number): this
  single<R = T>(): Promise<{ data: R | null; error: Error | null }>
  maybeSingle<R = T>(): Promise<{ data: R | null; error: Error | null }>
  then<R = T[]>(
    onfulfilled?: ((value: { data: R | null; error: Error | null; count?: number | null }) => any) | null,
    onrejected?: ((reason: any) => any) | null
  ): Promise<any>
}

/**
 * Data Source Interface
 * 데이터베이스 접근을 추상화하는 최상위 인터페이스
 */
export interface IDataSource {
  /**
   * 테이블 쿼리 시작
   */
  from<T = any>(table: string): IQueryBuilder<T>

  /**
   * RPC (Stored Procedure) 호출
   */
  rpc<T = any>(
    fn: string,
    params?: object
  ): Promise<{ data: T | null; error: Error | null }>

  /**
   * Auth 관련 메서드 (필요시 확장)
   */
  auth?: {
    getUser(): Promise<{ data: { user: any } | null; error: Error | null }>
    signOut(): Promise<{ error: Error | null }>
    signUp(credentials: {
      email: string
      password: string
      options?: { emailRedirectTo?: string; data?: object }
    }): Promise<{ data: { user: any; session: any } | null; error: Error | null }>
    signInWithPassword(credentials: {
      email: string
      password: string
    }): Promise<{ data: { user: any; session: any } | null; error: Error | null }>
    signInWithOAuth(options: {
      provider: string
      options?: { redirectTo?: string; scopes?: string }
    }): Promise<{ data: { url: string | null; provider: string } | null; error: Error | null }>
    resetPasswordForEmail(
      email: string,
      options?: { redirectTo?: string }
    ): Promise<{ data: object | null; error: Error | null }>
    updateUser(attributes: {
      email?: string
      password?: string
      data?: object
    }): Promise<{ data: { user: any } | null; error: Error | null }>
  }
}

/**
 * Data Source Provider 타입
 * 환경에 따라 적절한 DataSource를 반환하는 Provider 함수
 */
export type DataSourceProvider = () => IDataSource | Promise<IDataSource>
