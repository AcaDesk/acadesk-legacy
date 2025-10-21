/**
 * Environment Variables Validation & Type-Safe Access
 *
 * This module provides:
 * 1. Runtime validation of environment variables using Zod
 * 2. Type-safe access to env vars throughout the application
 * 3. Clear error messages when required env vars are missing
 *
 * Usage:
 * ```ts
 * import { env } from '@/lib/env'
 * const apiUrl = env.NEXT_PUBLIC_SUPABASE_URL
 * ```
 */

import { z } from 'zod'

/**
 * Environment type definition
 */
const envEnum = z.enum(['local', 'staging', 'production'])
export type Environment = z.infer<typeof envEnum>

/**
 * Schema for client-side environment variables
 * (prefixed with NEXT_PUBLIC_)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .min(1, 'NEXT_PUBLIC_APP_URL is required'),
  NEXT_PUBLIC_ENV: envEnum.optional().default('local'),
  NEXT_PUBLIC_ERROR_REPORTING_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})

/**
 * Schema for server-side environment variables
 * (not prefixed with NEXT_PUBLIC_)
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
})

/**
 * Combined schema for all environment variables
 */
const envSchema = clientEnvSchema.merge(serverEnvSchema)

/**
 * Validate environment variables
 *
 * @throws {ZodError} If validation fails
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

/**
 * Validated and type-safe environment variables
 *
 * Access env vars through this object for type safety:
 * ```ts
 * const url = env.NEXT_PUBLIC_SUPABASE_URL // string (validated)
 * const isProduction = env.NEXT_PUBLIC_ENV === 'production'
 * ```
 */
export const env = validateEnv()

/**
 * Utility functions
 */
export const isProduction = env.NEXT_PUBLIC_ENV === 'production'
export const isStaging = env.NEXT_PUBLIC_ENV === 'staging'
export const isLocal = env.NEXT_PUBLIC_ENV === 'local'
export const isDevelopment = isLocal || isStaging

/**
 * Get the current environment name
 */
export function getEnvironment(): Environment {
  return env.NEXT_PUBLIC_ENV
}

/**
 * Check if error reporting is enabled
 */
export function isErrorReportingEnabled(): boolean {
  return env.NEXT_PUBLIC_ERROR_REPORTING_ENABLED
}

/**
 * Get Supabase URL
 */
export function getSupabaseUrl(): string {
  return env.NEXT_PUBLIC_SUPABASE_URL
}

/**
 * Get Supabase Anon Key
 */
export function getSupabaseAnonKey(): string {
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

/**
 * Get App URL
 */
export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL
}
