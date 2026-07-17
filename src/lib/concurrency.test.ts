import { describe, it, expect, vi } from 'vitest'
import { mapWithConcurrency, withRetry } from './concurrency'

describe('mapWithConcurrency', () => {
  it('결과 순서는 입력 순서를 보존한다', async () => {
    const delays = [30, 10, 20]
    const result = await mapWithConcurrency(delays, 3, async (d, i) => {
      await new Promise((r) => setTimeout(r, d))
      return i * 10
    })
    expect(result).toEqual([0, 10, 20])
  })

  it('동시 실행 수가 limit을 넘지 않는다', async () => {
    let active = 0
    let maxActive = 0
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 10))
      active--
    })
    expect(maxActive).toBeLessThanOrEqual(2)
  })

  it('빈 배열은 즉시 빈 결과', async () => {
    const fn = vi.fn()
    expect(await mapWithConcurrency([], 5, fn)).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('fn이 throw하면 전체가 reject된다', async () => {
    await expect(
      mapWithConcurrency([1, 2], 2, async (n) => {
        if (n === 2) throw new Error('boom')
        return n
      })
    ).rejects.toThrow('boom')
  })
})

describe('withRetry', () => {
  it('첫 시도 성공 시 재시도하지 않는다', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    expect(await withRetry(fn, { delayMs: 1 })).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('실패 후 재시도해 성공하면 값을 반환한다', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered')
    expect(await withRetry(fn, { delayMs: 1 })).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('재시도 소진 시 마지막 에러를 throw한다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent'))
    await expect(withRetry(fn, { retries: 2, delayMs: 1 })).rejects.toThrow('persistent')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
