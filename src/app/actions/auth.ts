/**
 * Authentication Server Actions
 *
 * 모든 인증 관련 작업(회원가입, 로그인, 로그아웃)을 서버에서 처리합니다.
 * Supabase Auth API를 사용하되, 추가 로직(프로필 생성 등)을 서버 사이드에서 실행합니다.
 */

'use server'

// ⚠️ CRITICAL: Node 런타임 확인 필요
// Service role 키는 Edge 런타임에서 문제가 발생할 수 있음
// 런타임 설정은 'use server' 파일에서 불가능하므로,
// 호출하는 페이지/레이아웃에서 설정해야 함:
// export const runtime = 'nodejs'
// export const dynamic = 'force-dynamic'

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
/**
 * 이메일/비밀번호 로그인
 *
 * ⚠️ 중요: 성공 시 서버에서 바로 redirect()를 호출합니다
 *
 * 1. Supabase Auth로 로그인
 * 2. 온보딩 상태 확인
 * 3. 적절한 페이지로 리다이렉트
 *
 * @param input - 이메일, 비밀번호
 * @returns 에러 발생 시에만 반환 (성공 시 redirect로 인해 반환 안 됨)
 */
export async function signIn(input: z.infer<typeof signInSchema>): Promise<{ success: false; error: string } | never> {
  const requestId = crypto.randomUUID()

  try {
    // 1. Validate input
    const validated = signInSchema.parse(input)

    console.log('[signIn] Login attempt:', { requestId, email: validated.email })

    // 2. Create server client
    const supabase = await createServerClient()

    // 3. Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    })

    if (error) {
      console.error('[signIn] Auth error:', { requestId, error })
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    if (!data.user) {
      console.error('[signIn] No user in response:', { requestId })
      return {
        success: false,
        error: '로그인에 실패했습니다.',
      }
    }

    console.log('[signIn] Login successful:', { requestId })

    // 4. 온보딩 상태 확인
    const stageResult = await checkOnboardingStage()

    if (!stageResult.success || !stageResult.data) {
      console.error('[signIn] Onboarding stage check failed:', {
        requestId,
        error: stageResult.error,
      })
      // 상태 확인 실패해도 대시보드로 보냄
      revalidatePath('/', 'layout')
      redirect('/dashboard')
    }

    const stageData = stageResult.data as {
      ok: boolean
      stage?: { code: string; next_url?: string }
    }

    const { code: stageCode, next_url: nextUrl } = stageData.stage || {}

    // 5. 적절한 페이지로 리다이렉트
    const redirectUrl =
      nextUrl ||
      (stageCode === 'READY' ? '/dashboard' : `/auth/onboarding`)

    console.log('[signIn] Redirecting to:', { requestId, redirectUrl, stageCode })

    // 6. Revalidate and redirect
    revalidatePath('/', 'layout')
    redirect(redirectUrl)
  } catch (error) {
    // redirect()는 NEXT_REDIRECT 에러를 throw하므로 정상 케이스
    if (error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT')) {
      throw error // redirect() 에러는 그대로 전파
    }

    console.error('[signIn] Unexpected error:', {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    })

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
 * ⚠️ 중요: 이 함수는 서버에서 redirect()를 직접 호출합니다
 *
 * @param code - 인증 코드
 * @param type - 인증 타입 (signup, magiclink 등)
 */
export async function handleAuthCallback(code: string, type: string = 'signup'): Promise<never> {
  const requestId = crypto.randomUUID()

  try {
    console.log('[handleAuthCallback] Request started:', { requestId, type, hasCode: !!code })

    // 1. code 파라미터 검증
    if (!code) {
      console.error('[handleAuthCallback] Missing code parameter:', { requestId })
      redirect('/auth/login')
    }

    // 2. 서버에서 세션 교환
    const supabase = await createServerClient()
    const { data: sessionData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(
      code
    )

    if (exchangeErr) {
      console.error('[handleAuthCallback] Session exchange failed:', {
        requestId,
        code: exchangeErr.code,
        message: exchangeErr.message,
        status: exchangeErr.status,
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

      redirect(`/auth/link-expired?type=${type}&error=${errorType}`)
    }

    console.log('[handleAuthCallback] Session exchange success:', { requestId })

    // 3. 현재 사용자 정보 가져오기
    const user = sessionData?.user
    if (!user) {
      console.error('[handleAuthCallback] No user after session exchange:', { requestId })
      redirect('/auth/login')
    }

    const userId = user.id
    const userEmail = user.email || ''

    console.log('[handleAuthCallback] User retrieved:', { requestId })

    // 4. 이메일 인증 확인
    const emailConfirmedAt = user.email_confirmed_at ?? (user as any).confirmed_at

    if (!emailConfirmedAt) {
      console.warn('[handleAuthCallback] Email not confirmed yet:', { requestId })
      redirect(`/auth/verify-email?email=${encodeURIComponent(userEmail)}`)
    }

    // 5. 프로필 생성 (service_role 사용)
    console.log('[handleAuthCallback] Creating user profile:', { requestId })
    const profileResult = await createUserProfileServer(userId)

    if (!profileResult.success) {
      console.error('[handleAuthCallback] Profile creation failed:', {
        requestId,
        error: profileResult.error,
      })
      redirect('/auth/pending?error=profile_creation_failed')
    }

    console.log('[handleAuthCallback] Profile created/verified:', { requestId })

    // 6. 온보딩 상태 확인 및 라우팅 (service_role 사용)
    const stageResult = await checkOnboardingStage()

    if (!stageResult.success || !stageResult.data) {
      console.error('[handleAuthCallback] checkOnboardingStage failed:', {
        requestId,
        error: stageResult.error,
      })
      redirect(`/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`)
    }

    const stageData = stageResult.data as {
      ok: boolean
      stage?: { code: string; next_url?: string }
    }

    if (!stageData?.ok || !stageData.stage) {
      console.error('[handleAuthCallback] Invalid stage data:', { requestId })
      redirect(`/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`)
    }

    const { code: stageCode, next_url: nextUrl } = stageData.stage

    console.log('[handleAuthCallback] Auth stage determined:', {
      requestId,
      stageCode,
      hasNextUrl: !!nextUrl,
    })

    // 7. Revalidate layout
    revalidatePath('/', 'layout')

    // 8. 온보딩 상태에 따라 리다이렉트
    if (nextUrl) {
      redirect(nextUrl)
    } else if (stageCode === 'READY') {
      redirect('/dashboard')
    } else {
      redirect(`/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`)
    }
  } catch (error) {
    // redirect()는 NEXT_REDIRECT 에러를 throw하므로 정상 케이스
    // 그 외의 에러만 로깅
    if (error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT')) {
      throw error // redirect() 에러는 그대로 전파
    }

    console.error('[handleAuthCallback] Unexpected error:', {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    redirect('/auth/login')
  }
}

/**
 * 인증 후 후처리 (Post-Auth Setup) - Server-Side Redirect
 *
 * ⚠️ 중요: 이 함수는 클라이언트에서 exchangeCodeForSession을 완료한 후 호출됩니다.
 * PKCE flow: 코드 교환은 클라이언트에서, 프로필 생성/온보딩은 서버에서 분리
 *
 * 전제조건: 사용자가 이미 세션을 가지고 있어야 함
 *
 * 수행 작업:
 * 1. 현재 세션에서 사용자 정보 가져오기
 * 2. 프로필 생성 (멱등성 보장)
 * 3. 온보딩 단계 확인
 * 4. 서버에서 직접 리다이렉트 (쿠키 타이밍 레이스 방지)
 *
 * @throws {Error} NEXT_REDIRECT - redirect()가 throw하는 특수 에러
 */
export async function postAuthSetup(): Promise<never> {
  const requestId = crypto.randomUUID()

  try {
    console.log('[postAuthSetup] Starting post-auth setup:', { requestId })

    // 1. 현재 세션에서 사용자 정보 가져오기
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[postAuthSetup] No session found:', { requestId, error: userError })
      redirect('/auth/login')
    }

    const userId = user.id
    const userEmail = user.email || ''

    console.log('[postAuthSetup] User session found:', { requestId })

    // 2. 이메일 인증 확인
    const emailConfirmedAt = user.email_confirmed_at ?? (user as any).confirmed_at
    if (!emailConfirmedAt) {
      console.warn('[postAuthSetup] Email not confirmed yet:', { requestId })
      redirect(`/auth/verify-email?email=${encodeURIComponent(userEmail)}`)
    }

    // 3. 프로필 생성 (멱등성 보장 - 이미 있으면 스킵)
    console.log('[postAuthSetup] Creating user profile:', { requestId })
    const profileResult = await createUserProfileServer(userId)

    if (!profileResult.success) {
      console.error('[postAuthSetup] Profile creation failed:', {
        requestId,
        error: profileResult.error,
      })
      redirect('/auth/pending?error=profile_creation_failed')
    }

    // 4. 온보딩 단계 확인
    const stageResult = await checkOnboardingStage()

    if (!stageResult.success || !stageResult.data) {
      console.error('[postAuthSetup] Onboarding stage check failed:', {
        requestId,
        error: stageResult.error,
      })
      redirect(`/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`)
    }

    const stageData = stageResult.data as {
      ok: boolean
      stage?: { code: string; next_url?: string }
    }

    if (!stageData?.ok || !stageData.stage) {
      console.error('[postAuthSetup] Invalid stage data:', { requestId })
      redirect(`/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`)
    }

    const { code: stageCode, next_url: nextUrl } = stageData.stage

    console.log('[postAuthSetup] Auth stage determined:', {
      requestId,
      stageCode,
      hasNextUrl: !!nextUrl,
    })

    // 5. 캐시 무효화
    revalidatePath('/', 'layout')

    // 6. 서버에서 직접 리다이렉트 (쿠키-리다이렉트 타이밍 레이스 방지)
    const redirectUrl =
      nextUrl ||
      (stageCode === 'READY' ? '/dashboard' : `/auth/login?verified=true&email=${encodeURIComponent(userEmail)}`)

    console.log('[postAuthSetup] Redirecting to:', {
      requestId,
      redirectUrl,
    })

    redirect(redirectUrl)
  } catch (error) {
    // redirect()는 NEXT_REDIRECT 에러를 throw하므로 정상 케이스
    if (error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT')) {
      throw error // redirect() 에러는 그대로 전파
    }

    console.error('[postAuthSetup] Unexpected error:', {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    })
    redirect('/auth/login')
  }
}
