/**
 * Onboarding Server Actions
 *
 * 원장님 온보딩 워크플로 (회원가입 → 이메일 인증 → 프로필 생성 → 학원 설정)를
 * 완전한 server-side + service_role 기반으로 처리합니다.
 *
 * 핵심 원칙:
 * 1. 모든 중요 온보딩 로직은 서버에서만 실행
 * 2. Service role은 RLS 우회가 필요한 작업에만 사용
 * 3. 사용자 인증은 반드시 확인
 * 4. 멱등성 보장 (중복 호출 시에도 안전)
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const completeOwnerOnboardingSchema = z.object({
  academyName: z.string().min(2, '학원명은 2자 이상이어야 합니다.'),
  ownerName: z.string().optional(),
  timezone: z.string().default('Asia/Seoul'),
  settings: z
    .object({
      address: z.string().optional(),
      phone: z.string().optional(),
      businessHours: z
        .object({
          start: z.string(),
          end: z.string(),
        })
        .optional(),
      subjects: z.array(z.string()).optional(),
    })
    .optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 프로필 자동 생성 (이메일 인증 콜백에서 호출)
 *
 * ⚠️ CRITICAL: Service role 사용 - RLS 우회
 * 이메일 인증 직후 사용자는 아직 세션이 없거나 불완전할 수 있으므로
 * service_role로 프로필을 생성합니다.
 *
 * 멱등성: 이미 프로필이 있으면 성공 반환
 *
 * @param userId - auth.users.id
 * @returns 성공 여부 및 에러 메시지
 */
export async function createUserProfileServer(userId: string) {
  const requestId = crypto.randomUUID()

  try {
    // 1. Validate input
    if (!userId) {
      console.error('[createUserProfileServer] Missing userId:', { requestId })
      return {
        success: false,
        error: '사용자 ID가 필요합니다.',
      }
    }

    console.log('[createUserProfileServer] Request started:', { requestId, userId })

    // 2. Service role client로 프로필 생성
    const serviceClient = createServiceRoleClient()

    // create_user_profile RPC는 auth.uid()를 사용하므로
    // 대신 직접 프로필을 생성합니다
    const { error: checkError, data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('[createUserProfileServer] Check error:', { requestId, userId, error: checkError })
      return {
        success: false,
        error: '프로필 확인 중 오류가 발생했습니다.',
      }
    }

    // 이미 프로필이 있으면 성공 반환 (멱등성)
    if (existingUser) {
      console.log('[createUserProfileServer] Profile already exists:', { requestId, userId })
      return {
        success: true,
        data: { message: '이미 프로필이 존재합니다.' },
      }
    }

    // 3. auth.users에서 이메일 가져오기
    const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(
      userId
    )

    if (authError || !authUser.user) {
      console.error('[createUserProfileServer] Auth user not found:', { requestId, userId, error: authError })
      return {
        success: false,
        error: '인증 사용자를 찾을 수 없습니다.',
      }
    }

    const email = authUser.user.email || ''
    const name = authUser.user.user_metadata?.full_name || email

    console.log('[createUserProfileServer] Creating profile:', { requestId, userId, email, name })

    // 4. 프로필 생성 (타임스탬프 명시)
    const now = new Date().toISOString()
    const { error: insertError } = await serviceClient.from('users').insert({
      id: userId,
      email: email,
      name: name,
      role_code: null,
      tenant_id: null,
      onboarding_completed: false,
      approval_status: 'pending',
      created_at: now,
      updated_at: now,
    })

    if (insertError) {
      console.error('[createUserProfileServer] Insert error:', { requestId, userId, error: insertError })

      // 이미 존재하는 경우 (race condition) 성공으로 처리
      if (insertError.code === '23505') {
        console.log('[createUserProfileServer] Profile created by concurrent request (race condition):', {
          requestId,
          userId,
        })
        return {
          success: true,
          data: { message: '프로필이 생성되었습니다.' },
        }
      }

      return {
        success: false,
        error: '프로필 생성 중 오류가 발생했습니다.',
      }
    }

    console.log('[createUserProfileServer] Profile created successfully:', { requestId, userId })

    return {
      success: true,
      data: { message: '프로필이 생성되었습니다.' },
    }
  } catch (error) {
    console.error('[createUserProfileServer] Exception:', {
      requestId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 원장 온보딩 완료 (학원 설정)
 *
 * ⚠️ CRITICAL: Service role 사용 - 테넌트 생성 및 권한 부여
 *
 * 워크플로:
 * 1. 현재 사용자 인증 확인 (일반 client)
 * 2. Service role로 complete_owner_onboarding RPC 호출 (테넌트 생성 + 권한 부여)
 * 3. 일반 client로 finish_owner_academy_setup RPC 호출 (학원 설정)
 *
 * @param input - 학원명, 타임존, 설정
 * @returns 성공 여부 및 에러 메시지
 */
export async function completeOwnerOnboarding(
  input: z.infer<typeof completeOwnerOnboardingSchema>
) {
  const requestId = crypto.randomUUID()

  try {
    // 1. Validate input
    const validated = completeOwnerOnboardingSchema.parse(input)

    console.log('[completeOwnerOnboarding] Request started:', {
      requestId,
      academyName: validated.academyName,
    })

    // 2. 현재 사용자 인증 확인
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[completeOwnerOnboarding] Auth error:', { requestId, error: authError })
      return {
        success: false,
        error: '인증되지 않은 사용자입니다.',
      }
    }

    const userId = user.id

    console.log('[completeOwnerOnboarding] User authenticated:', { requestId, userId })

    // 3. 사용자 정보 가져오기 (SERVICE ROLE로 통일 - RLS 우회)
    // 이미 인증 확인을 했으므로 service_role로 읽어도 안전합니다.
    const serviceClient = createServiceRoleClient()
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('name, email, role_code, tenant_id, approval_status, onboarding_completed')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      console.error('[completeOwnerOnboarding] User query error:', { requestId, userId, error: userError })
      return {
        success: false,
        error: '사용자 정보를 가져오는 중 오류가 발생했습니다.',
      }
    }

    if (!userData) {
      console.error('[completeOwnerOnboarding] User not found:', { requestId, userId })
      return {
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.',
      }
    }

    console.log('[completeOwnerOnboarding] User data retrieved:', {
      requestId,
      userId,
      roleCode: userData.role_code,
      tenantId: userData.tenant_id,
      approvalStatus: userData.approval_status,
    })

    // 4. 권한 검증: 이미 다른 역할이거나 다른 테넌트 소속인 경우
    if (userData.role_code && userData.role_code !== 'owner' && userData.tenant_id) {
      console.warn('[completeOwnerOnboarding] User already has different role:', {
        requestId,
        userId,
        roleCode: userData.role_code,
        tenantId: userData.tenant_id,
      })
      return {
        success: false,
        error: '이미 다른 역할로 등록되어 있습니다. 관리자에게 문의해주세요.',
      }
    }

    // 5. 이미 온보딩 완료된 경우 체크 (멱등성)
    if (userData.tenant_id && userData.role_code === 'owner' && userData.onboarding_completed) {
      console.log('[completeOwnerOnboarding] Owner already completed onboarding:', {
        requestId,
        userId,
        tenantId: userData.tenant_id,
      })

      // 학원 설정만 업데이트 (service_role로 직접 업데이트)
      const { error: updateError } = await serviceClient
        .from('tenants')
        .update({
          name: validated.academyName,
          timezone: validated.timezone,
          settings: validated.settings || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.tenant_id)

      if (updateError) {
        console.error('[completeOwnerOnboarding] Tenant update error:', {
          requestId,
          userId,
          error: updateError,
        })
        return {
          success: false,
          error: '학원 설정 업데이트 중 오류가 발생했습니다.',
        }
      }

      // Revalidate: 대시보드와 레이아웃 모두
      revalidatePath('/', 'layout')
      revalidatePath('/dashboard')
      revalidatePath('/dashboard', 'page')

      console.log('[completeOwnerOnboarding] Academy settings updated:', {
        requestId,
        userId,
        tenantId: userData.tenant_id,
      })

      return {
        success: true,
        data: {
          userId,
          tenantId: userData.tenant_id,
          message: '학원 설정이 업데이트되었습니다.',
        },
      }
    }

    // 6. Service role로 테넌트 생성 + 학원 설정 (트랜잭션)
    // ⚠️ 중요: 모든 작업을 service_role로 수행하여 RLS 우회 및 일관성 보장

    const ownerName =
      validated.ownerName ||
      userData.name ||
      user.user_metadata?.full_name ||
      userData.email ||
      user.email ||
      '원장님'

    console.log('[completeOwnerOnboarding] Creating tenant and academy setup:', {
      requestId,
      userId,
      ownerName,
      academyName: validated.academyName,
    })

    // 6-1. 테넌트 생성
    const slug = `academy-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const { data: tenantData, error: tenantError } = await serviceClient
      .from('tenants')
      .insert({
        name: validated.academyName,
        slug: slug,
        timezone: validated.timezone,
        settings: validated.settings || {},
      })
      .select('id')
      .single()

    if (tenantError || !tenantData) {
      console.error('[completeOwnerOnboarding] Tenant creation error:', {
        requestId,
        userId,
        error: tenantError,
      })
      return {
        success: false,
        error: '학원 생성 중 오류가 발생했습니다.',
      }
    }

    const tenantId = tenantData.id

    console.log('[completeOwnerOnboarding] Tenant created:', {
      requestId,
      userId,
      tenantId,
    })

    // 6-2. 사용자를 owner로 업데이트 (onboarding_completed = true)
    const now = new Date().toISOString()
    const { error: userUpdateError } = await serviceClient
      .from('users')
      .update({
        name: ownerName,
        role_code: 'owner',
        tenant_id: tenantId,
        onboarding_completed: true,
        onboarding_completed_at: now,
        approval_status: 'approved',
        approved_at: now,
        updated_at: now,
      })
      .eq('id', userId)

    if (userUpdateError) {
      console.error('[completeOwnerOnboarding] User update error:', {
        requestId,
        userId,
        tenantId,
        error: userUpdateError,
      })
      // 테넌트는 생성되었으므로 수동으로 롤백하거나 에러 반환
      return {
        success: false,
        error: '사용자 권한 설정 중 오류가 발생했습니다.',
      }
    }

    console.log('[completeOwnerOnboarding] User updated to owner:', {
      requestId,
      userId,
      tenantId,
    })

    // 8. Revalidate paths (대시보드와 레이아웃 모두)
    revalidatePath('/', 'layout')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard', 'page')

    console.log('[completeOwnerOnboarding] Owner onboarding completed successfully:', {
      requestId,
      userId,
      tenantId,
    })

    return {
      success: true,
      data: {
        userId,
        tenantId,
        message: '학원 설정이 완료되었습니다.',
      },
    }
  } catch (error) {
    console.error('[completeOwnerOnboarding] Error:', error)

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
 * 온보딩 상태 확인
 *
 * ✅ 완전히 service_role 기반으로 구현 (RPC 제거)
 *
 * 현재 사용자의 온보딩 단계를 확인하여 다음 페이지를 결정합니다:
 * - NO_PROFILE → /auth/bootstrap
 * - MEMBER_INVITED → /auth/invite/accept?token={token}
 * - PENDING_OWNER_REVIEW → /auth/pending
 * - OWNER_SETUP_REQUIRED → /auth/owner/setup
 * - READY → 대시보드 접근 가능
 *
 * @param inviteToken - 초대 토큰 (선택)
 * @returns 온보딩 상태
 */
export async function checkOnboardingStage(inviteToken?: string) {
  const requestId = crypto.randomUUID()

  try {
    // 1. Get current user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[checkOnboardingStage] Auth error:', { requestId, error: authError })
      return {
        success: false,
        error: '인증되지 않은 사용자입니다.',
        data: null,
      }
    }

    const userId = user.id

    // 2. Check user profile with service_role
    const serviceClient = createServiceRoleClient()
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('id, tenant_id, role_code, approval_status, onboarding_completed')
      .eq('id', userId)
      .maybeSingle()

    // Stage 1: NO_PROFILE (user doesn't exist in users table)
    if (userError || !userData) {
      console.log('[checkOnboardingStage] NO_PROFILE stage:', { requestId, userId })
      return {
        success: true,
        data: {
          ok: true,
          stage: {
            code: 'NO_PROFILE',
            next_url: '/auth/bootstrap',
          },
        },
      }
    }

    // Stage 2: MEMBER_INVITED (has invite token and not yet accepted)
    if (inviteToken) {
      const { data: inviteData } = await serviceClient
        .from('invites')
        .select('id, tenant_id, email, expires_at')
        .eq('token', inviteToken)
        .maybeSingle()

      if (inviteData && new Date(inviteData.expires_at) > new Date()) {
        console.log('[checkOnboardingStage] MEMBER_INVITED stage:', { requestId, userId, inviteToken })
        return {
          success: true,
          data: {
            ok: true,
            stage: {
              code: 'MEMBER_INVITED',
              next_url: `/auth/invite/accept?token=${inviteToken}`,
            },
          },
        }
      }
    }

    // Stage 3: PENDING_OWNER_REVIEW (pending approval, no role)
    if (userData.approval_status === 'pending' && !userData.role_code) {
      console.log('[checkOnboardingStage] PENDING_OWNER_REVIEW stage:', { requestId, userId })
      return {
        success: true,
        data: {
          ok: true,
          stage: {
            code: 'PENDING_OWNER_REVIEW',
            next_url: '/auth/pending',
          },
        },
      }
    }

    // Stage 4: OWNER_SETUP_REQUIRED (owner but onboarding incomplete)
    if (userData.role_code === 'owner' && !userData.onboarding_completed) {
      console.log('[checkOnboardingStage] OWNER_SETUP_REQUIRED stage:', { requestId, userId })
      return {
        success: true,
        data: {
          ok: true,
          stage: {
            code: 'OWNER_SETUP_REQUIRED',
            next_url: '/auth/owner/setup',
          },
        },
      }
    }

    // Stage 5: READY (all checks passed)
    console.log('[checkOnboardingStage] READY stage:', {
      requestId,
      userId,
      roleCode: userData.role_code,
      tenantId: userData.tenant_id,
    })

    return {
      success: true,
      data: {
        ok: true,
        stage: {
          code: 'READY',
          next_url: null,
        },
      },
    }
  } catch (error) {
    console.error('[checkOnboardingStage] Error:', { requestId, error })
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 온보딩 상태 조회 (get_onboarding_state RPC)
 *
 * 현재 사용자의 온보딩 완료 여부, 역할, 테넌트, 승인 상태를 확인합니다.
 *
 * @returns 온보딩 상태
 */
export async function getOnboardingState() {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase.rpc('get_onboarding_state')

    if (error) {
      console.error('[getOnboardingState] RPC error:', error)
      return {
        success: false,
        error: '온보딩 상태 조회 중 오류가 발생했습니다.',
        data: null,
      }
    }

    const response = data as { ok: boolean; data?: any; code?: string; message?: string }

    if (!response?.ok) {
      console.error('[getOnboardingState] RPC returned error:', response)
      return {
        success: false,
        error: response?.message || '온보딩 상태 조회 중 오류가 발생했습니다.',
        data: null,
      }
    }

    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    console.error('[getOnboardingState] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}
