/**
 * 리스트 서버 액션 표준 페이지네이션 유틸
 *
 * consultations.ts에서 검증된 page/pageSize + count:'planned' + .range() 패턴을
 * 표준화한다. 새 리스트 액션은 이 유틸을 사용할 것.
 *
 * @example
 * const range = resolvePageRange(options)
 * const { data, count, error } = await supabase
 *   .from('items')
 *   .select('...', { count: 'planned' })
 *   .eq('tenant_id', tenantId)
 *   .range(range.from, range.to)
 * return buildPaginatedResult(data ?? [], count, range)
 */

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PageRange {
  page: number
  pageSize: number
  from: number
  to: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

/** page/pageSize를 검증·클램프해 Supabase .range() 인자로 변환 */
export function resolvePageRange(
  params?: PaginationParams,
  defaultPageSize: number = DEFAULT_PAGE_SIZE
): PageRange {
  const pageSize = Math.min(
    Math.max(Math.trunc(params?.pageSize ?? defaultPageSize), 1),
    MAX_PAGE_SIZE
  )
  const page = Math.max(Math.trunc(params?.page ?? 1), 1)
  const from = (page - 1) * pageSize
  return { page, pageSize, from, to: from + pageSize - 1 }
}

/** 조회 결과 + count를 표준 페이지네이션 응답으로 조립 */
export function buildPaginatedResult<T>(
  items: T[],
  count: number | null,
  range: PageRange
): PaginatedResult<T> {
  const total = count ?? items.length
  return {
    items,
    total,
    page: range.page,
    pageSize: range.pageSize,
    totalPages: Math.max(Math.ceil(total / range.pageSize), 1),
  }
}
