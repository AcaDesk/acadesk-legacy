/**
 * 동시성 제한 유틸 (외부 API 호출 병렬화용)
 *
 * 대량 알림톡/SMS 발송처럼 항목별 외부 호출이 필요한 작업을
 * 완전 직렬(느림)도 무제한 병렬(프로바이더 스로틀 위험)도 아닌
 * 고정 동시성 워커 풀로 처리한다.
 */

/**
 * items를 최대 limit개 동시 실행으로 매핑한다. 결과 순서는 입력 순서를 보존한다.
 * fn이 throw하면 전체가 reject되므로, 개별 실패를 수집하려면 fn 내부에서 처리할 것.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []

  const results = new Array<R>(items.length)
  let nextIndex = 0

  const workerCount = Math.max(1, Math.min(limit, items.length))
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      results[index] = await fn(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * fn을 실행하고 실패 시 delayMs 대기 후 재시도한다 (기본 1회).
 * 일시적 네트워크/프로바이더 오류 흡수용 — 멱등하지 않은 작업에는 사용 주의.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; delayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 1
  const delayMs = options?.delayMs ?? 500

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastError
}
