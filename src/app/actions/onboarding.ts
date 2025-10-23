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

      // 학원 설정만 업데이트 (일반 client로 호출)
      const { error: updateError } = await supabase.rpc('finish_owner_academy_setup', {
        _academy_name: validated.academyName,
        _timezone: validated.timezone,
        _settings: validated.settings || {},
      })

      if (updateError) {
        console.error('[completeOwnerOnboarding] finish_owner_academy_setup error:', {
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

    // 6. Service role로 complete_owner_onboarding 호출
    // ⚠️ 중요: 이 RPC는 트랜잭션 내에서 테넌트 생성 + 유저 업데이트를 수행합니다.
    // 실패 시 자동으로 롤백되므로 원자성이 보장됩니다.

    const ownerName =
      validated.ownerName ||
      userData.name ||
      user.user_metadata?.full_name ||
      userData.email ||
      user.email ||
      '원장님'

    console.log('[completeOwnerOnboarding] Calling complete_owner_onboarding RPC:', {
      requestId,
      userId,
      ownerName,
      academyName: validated.academyName,
    })

    const { data: onboardingData, error: onboardingError } = await serviceClient.rpc(
      'complete_owner_onboarding',
      {
        _user_id: userId,
        _name: ownerName,
        _academy_name: validated.academyName,
        _slug: null, // 자동 생성
      }
    )

    if (onboardingError) {
      console.error('[completeOwnerOnboarding] complete_owner_onboarding RPC error:', {
        requestId,
        userId,
        error: onboardingError,
      })
      return {
        success: false,
        error: '원장 온보딩 처리 중 오류가 발생했습니다.',
      }
    }

    const response = onboardingData as { ok: boolean; data?: any; code?: string; message?: string }

    if (!response?.ok) {
      console.error('[completeOwnerOnboarding] RPC returned error:', {
        requestId,
        userId,
        response,
      })
      return {
        success: false,
        error: response?.message || '원장 온보딩 처리 중 오류가 발생했습니다.',
      }
    }

    const tenantId = response.data?.tenant?.id

    console.log('[completeOwnerOnboarding] Tenant created:', {
      requestId,
      userId,
      tenantId,
    })

    // 7. 학원 설정 업데이트 (finish_owner_academy_setup)
    // 이제 사용자가 owner 권한을 가지므로 일반 client로 호출 가능
    const { error: setupError } = await supabase.rpc('finish_owner_academy_setup', {
      _academy_name: validated.academyName,
      _timezone: validated.timezone,
      _settings: validated.settings || {},
    })

    if (setupError) {
      console.error('[completeOwnerOnboarding] finish_owner_academy_setup error:', {
        requestId,
        userId,
        tenantId,
        error: setupError,
      })
      // 테넌트는 생성되었지만 설정 업데이트 실패
      // 사용자가 다시 시도할 수 있도록 부분 성공으로 처리
      return {
        success: true,
        data: {
          userId,
          tenantId,
          warning: '테넌트는 생성되었지만 학원 설정 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.',
        },
      }
    }

    console.log('[completeOwnerOnboarding] Academy settings updated:', {
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
 * get_auth_stage RPC 호출하여 현재 사용자의 온보딩 단계를 확인합니다.
 *
 * @param inviteToken - 초대 토큰 (선택)
 * @returns 온보딩 상태
 */
export async function checkOnboardingStage(inviteToken?: string) {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase.rpc('get_auth_stage', {
      p_invite_token: inviteToken || null,
    })

    if (error) {
      console.error('[checkOnboardingStage] RPC error:', error)
      return {
        success: false,
        error: '온보딩 상태 확인 중 오류가 발생했습니다.',
        data: null,
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[checkOnboardingStage] Error:', error)
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
