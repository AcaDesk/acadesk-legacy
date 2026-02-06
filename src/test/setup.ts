/**
 * Vitest Setup
 *
 * Global test setup for all Vitest tests
 */

import { expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))
