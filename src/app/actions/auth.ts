/**
 * Authentication Server Actions
 *
 * 모든 인증 관련 작업(회원가입, 로그인, 로그아웃)을 서버에서 처리합니다.
 * Supabase Auth API를 사용하되, 추가 로직(프로필 생성 등)을 서버 사이드에서 실행합니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { createUserProfileServer, checkOnboardingStage } from './onboarding'

// ============================================================================
// Validation Schemas
// ============================================================================

const signUpSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다.')
    .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
})

const signInSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

const signInWithOAuthSchema = z.object({
  provider: z.enum(['google', 'kakao']),
})

const resetPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
})

const updatePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(/[a-zA-Z]/, '영문자를 포함해야 합니다.')
    .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 에러 메시지를 사용자 친화적인 한국어로 변환
 */
function getAuthErrorMessage(error: any): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
    'User already registered': '이미 가입된 이메일입니다.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'Unable to validate email address: invalid format': '이메일 형식이 올바르지 않습니다.',
    'Signups not allowed for this instance': '현재 회원가입이 불가능합니다.',
    'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    'For security purposes, you can only request this once every 60 seconds':
      '보안을 위해 60초에 한 번만 요청할 수 있습니다.',
  }

  const message = error?.message || error || '알 수 없는 오류가 발생했습니다.'
  return errorMap[message] || message
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 이메일/비밀번호로 회원가입
 *
 * 1. Supabase Auth로 계정 생성 (이메일 인증 필요)
 * 2. 이메일 인증 완료 시 자동으로 프로필 생성 (Server Action 통해)
 *
 * @param input - 이메일, 비밀번호
 * @returns 성공 여부 및 에러 메시지
 */
export async function signUp(input: z.infer<typeof signUpSchema>) {
  try {
    // 1. Validate input
    const validated = signUpSchema.parse(input)

    // 2. Create server client
    const supabase = await createServerClient()

    // 3. Get app URL for email redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 4. Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      console.error('Sign up error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    // 5. 이메일 인증이 완료된 경우 프로필 생성 (Server Action 사용)
    // (보통은 이메일 확인 후 callback에서 처리하지만, 즉시 확인된 경우 여기서 처리)
    if (data?.user && data.user.email_confirmed_at) {
      const profileResult = await createUserProfileServer(data.user.id)

      if (!profileResult.success) {
        console.error('Failed to create user profile:', profileResult.error)
        // 프로필 생성 실패해도 회원가입은 성공으로 처리 (나중에 재시도 가능)
      }
    }

    return {
      success: true,
      data: {
        userId: data.user?.id,
        email: validated.email,
      },
    }
  } catch (error) {
    console.error('Sign up error:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 이메일/비밀번호로 로그인
 *
 * @param input - 이메일, 비밀번호
 * @returns 성공 여부 및 에러 메시지
 */
export async function signIn(input: z.infer<typeof signInSchema>) {
  try {
    // 1. Validate input
    const validated = signInSchema.parse(input)

    // 2. Create server client
    const supabase = await createServerClient()

    // 3. Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    })

    if (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    // 4. Revalidate paths to update UI
    revalidatePath('/', 'layout')

    return {
      success: true,
      data: {
        userId: data.user?.id,
        email: data.user?.email,
      },
    }
  } catch (error) {
    console.error('Sign in error:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 소셜 로그인 (Google, Kakao)
 *
 * OAuth 리다이렉트 URL을 반환합니다.
 * 클라이언트에서 이 URL로 이동하여 OAuth 인증을 시작합니다.
 *
 * @param input - provider (google | kakao)
 * @returns OAuth 리다이렉트 URL 또는 에러
 */
export async function signInWithOAuth(
  input: z.infer<typeof signInWithOAuthSchema>
) {
  try {
    // 1. Validate input
    const validated = signInWithOAuthSchema.parse(input)

    // 2. Create server client
    const supabase = await createServerClient()

    // 3. Get app URL for OAuth redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 4. Sign in with OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: validated.provider,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      console.error('OAuth sign in error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return {
      success: true,
      data: {
        url: data.url,
      },
    }
  } catch (error) {
    console.error('OAuth sign in error:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 로그아웃
 *
 * @returns 성공 여부 및 에러 메시지
 */
export async function signOut() {
  try {
    // 1. Create server client
    const supabase = await createServerClient()

    // 2. Sign out
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    // 3. Revalidate and redirect
    revalidatePath('/', 'layout')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Sign out error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 *
 * @param input - 이메일
 * @returns 성공 여부 및 에러 메시지
 */
export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  try {
    // 1. Validate input
    const validated = resetPasswordSchema.parse(input)

    // 2. Create server client
    const supabase = await createServerClient()

    // 3. Get app URL for password reset redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 4. Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    })

    if (error) {
      console.error('Reset password error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Reset password error:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 비밀번호 업데이트
 *
 * 사용자가 로그인한 상태에서 비밀번호를 변경합니다.
 *
 * @param input - 새 비밀번호
 * @returns 성공 여부 및 에러 메시지
 */
export async function updatePassword(
  input: z.infer<typeof updatePasswordSchema>
) {
  try {
    // 1. Validate input
    const validated = updatePasswordSchema.parse(input)

    // 2. Create server client
    const supabase = await createServerClient()

    // 3. Update password
    const { error } = await supabase.auth.updateUser({
      password: validated.newPassword,
    })

    if (error) {
      console.error('Update password error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('Update password error:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 현재 로그인한 사용자 조회
 *
 * @returns 사용자 정보 또는 null
 */
export async function getCurrentUser() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Get current user error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
        data: null,
      }
    }

    return {
      success: true,
      data: user,
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 매직링크 로그인 (OTP) 발송
 *
 * 이메일로 매직링크를 발송합니다.
 * - 이미 인증된 사용자: 로그인 링크 발송
 * - 미인증 사용자: 가입 인증 링크 발송
 *
 * @param email - 이메일 주소
 * @returns 성공 여부 및 에러 메시지
 */
export async function sendMagicLink(email: string) {
  try {
    // 이메일 형식 검증
    const emailSchema = z.string().email('올바른 이메일 형식이 아닙니다.')
    const validated = emailSchema.parse(email)

    // Server 클라이언트로 매직링크 발송
    const supabase = await createServerClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const { error } = await supabase.auth.signInWithOtp({
      email: validated,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?type=magiclink`,
      },
    })

    if (error) {
      console.error('[sendMagicLink] Error:', error)
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error('[sendMagicLink] Exception:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      }
    }

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 인증 콜백 처리 (Server Action)
 *
 * 완전한 server-side + service_role 기반 인증 콜백 처리
 * 이메일 인증 링크 클릭 후 코드 교환 및 프로필 생성
 *
 * @param code - 인증 코드
 * @param type - 인증 타입 (signup, magiclink 등)
 * @returns 성공 여부, 다음 URL, 에러 메시지
 */
export async function handleAuthCallback(code: string, type: string = 'signup') {
  const requestId = crypto.randomUUID()

  try {
    console.log('[handleAuthCallback] Request started:', { requestId, type, hasCode: !!code })

    // 1. code 파라미터 검증
    if (!code) {
      console.error('[handleAuthCallback] Missing code parameter:', { requestId })
      return {
        success: false,
        error: '인증 코드가 없습니다.',
        nextUrl: '/auth/login',
      }
    }

    // 2. 서버에서 세션 교환
    const supabase = await createServerClient()
    const { data: sessionData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
      code
    )

    if (exchangeErr) {
      console.error('[handleAuthCallback] Session exchange failed:', {
        requestId,
        message: exchangeErr.message,
        status: exchangeErr.status,
        code: exchangeErr.code,
        name: exchangeErr.name,
      })

      // 에러 타입 분류
      let errorType = 'unknown'
      const m = exchangeErr.message?.toLowerCase() || ''
      const c = exchangeErr.code?.toLowerCase() || ''

      if (m.includes('expired') || c.includes('expired')) errorType = 'expired'
      else if (m.includes('already') || m.includes('used') || c.includes('consumed'))
        errorType = 'used'
      else if (m.includes('invalid') || c.includes('invalid') || m.includes('not found'))
        errorType = 'invalid'

      return {
        success: false,
        error: getAuthErrorMessage(exchangeErr),
        nextUrl: `/auth/link-expired?type=${type}&error=${errorType}`,
      }
    }

    console.log('[handleAuthCallback] Session exchange success:', { requestId })

    // 3. 현재 사용자 정보 가져오기
    const user = sessionData?.user
    if (!user) {
      console.error('[handleAuthCallback] No user after session exchange:', { requestId })
      return {
        success: false,
        error: '사용자 정보를 가져올 수 없습니다.',
        nextUrl: '/auth/login',
      }
    }

    const userId = user.id
    const userEmail = user.email || ''

    console.log('[handleAuthCallback] User retrieved:', { requestId, userId, email: userEmail })

    // 4. 이메일 인증 확인
    const emailConfirmedAt = user.email_confirmed_at ?? (user as any).confirmed_at

    if (!emailConfirmedAt) {
      console.warn('[handleAuthCallback] Email not confirmed yet:', { requestId, userId })
      return {
        success: false,
        error: '이메일 인증이 필요합니다.',
        nextUrl: `/auth/verify-email?email=${encodeURIComponent(userEmail)}`,
      }
    }

    // 5. 프로필 생성 (service_role 사용)
    console.log('[handleAuthCallback] Creating user profile:', { requestId, userId })
    const profileResult = await createUserProfileServer(userId)

    if (!profileResult.success) {
      console.error('[handleAuthCallback] Profile creation failed:', {
        requestId,
        userId,
        error: profileResult.error,
      })
      return {
        success: false,
        error: profileResult.error || '프로필 생성에 실패했습니다.',
        nextUrl: '/auth/pending?error=profile_creation_failed',
      }
    }

    console.log('[handleAuthCallback] Profile created/verified:', { requestId, userId })

    // 6. 온보딩 상태 확인 및 라우팅 (service_role 사용)
    const stageResult = await checkOnboardingStage()

    if (!stageResult.success || !stageResult.data) {
      console.error('[handleAuthCallback] checkOnboardingStage failed:', {
        requestId,
        userId,
        error: stageResult.error,
      })
      return {
        success: false,
        error: stageResult.error || '온보딩 상태 확인에 실패했습니다.',
        nextUrl: `/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`,
      }
    }

    const stageData = stageResult.data as {
      ok: boolean
      stage?: { code: string; next_url?: string }
    }

    if (!stageData?.ok || !stageData.stage) {
      console.error('[handleAuthCallback] Invalid stage data:', {
        requestId,
        userId,
        stageData,
      })
      return {
        success: false,
        error: '온보딩 상태가 올바르지 않습니다.',
        nextUrl: `/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`,
      }
    }

    const { code: stageCode, next_url: nextUrl } = stageData.stage

    console.log('[handleAuthCallback] Auth stage determined:', {
      requestId,
      userId,
      stageCode,
      nextUrl: nextUrl || 'none',
    })

    // 7. 온보딩 상태에 따라 다음 URL 결정
    let redirectUrl: string
    if (nextUrl) {
      redirectUrl = nextUrl
    } else if (stageCode === 'READY') {
      redirectUrl = '/dashboard'
    } else {
      redirectUrl = `/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`
    }

    console.log('[handleAuthCallback] Success, redirecting to:', { requestId, redirectUrl })

    return {
      success: true,
      nextUrl: redirectUrl,
      userId,
      email: userEmail,
    }
  } catch (error) {
    console.error('[handleAuthCallback] Unexpected error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: getErrorMessage(error),
      nextUrl: '/auth/login',
    }
  }
}
