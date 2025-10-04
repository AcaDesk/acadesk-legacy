/**
 * Common validation utilities
 */

import * as z from 'zod'

// ============================================================================
// Common schemas
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format')

export const emailSchema = z.string().email('Invalid email format')

export const phoneSchema = z
  .string()
  .regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, 'Invalid phone number format')

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export const sortSchema = z.object({
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

export const searchSchema = z.object({
  search: z.string().optional(),
})

// ============================================================================
// Domain-specific schemas
// ============================================================================

export const studentStatusSchema = z.enum(['active', 'inactive', 'withdrawn'])

export const gradeLevelSchema = z.enum([
  'elem1',
  'elem2',
  'elem3',
  'elem4',
  'elem5',
  'elem6',
  'middle1',
  'middle2',
  'middle3',
  'high1',
  'high2',
  'high3',
])

export const attendanceStatusSchema = z.enum(['present', 'absent', 'late', 'excused'])

export const taskStatusSchema = z.enum(['pending', 'completed', 'overdue'])

export const sessionStatusSchema = z.enum(['scheduled', 'completed', 'cancelled'])

export const roleSchema = z.enum(['admin', 'teacher', 'staff'])

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Parse and validate query parameters
 */
export function validateQueryParams<T extends z.ZodType>(
  schema: T,
  params: unknown
): z.infer<T> {
  return schema.parse(params)
}

/**
 * Safely parse without throwing
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Extract validation error messages
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    errors[path] = err.message
  })
  return errors
}
