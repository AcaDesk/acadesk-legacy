/**
 * Vitest Setup
 *
 * Global test setup for all Vitest tests
 */

import { vi } from 'vitest'

// jest-dom 매처는 DOM 환경에서만 로드
// (tests/integration은 @vitest-environment node로 실행되어 document가 없음)
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
}

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
