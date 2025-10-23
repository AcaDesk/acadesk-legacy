import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// 인증 리소스는 항상 동적으로
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1) 현재 세션 사용자 확인
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    // 2) service_role로 테넌트 조회
    const admin = await createServiceRoleClient()
    const { data, error } = await admin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (error) {
      // DB 에러는 500
      console.error('[GET /api/auth/tenant] DB error:', error)
      return NextResponse.json(
        { error: 'Failed to read tenant' },
        {
          status: 500,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    if (!data) {
      // 사용자 행 없음 → 200(null)
      return NextResponse.json(
        { tenantId: null },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    // 3) 성공
    return NextResponse.json(
      { tenantId: data.tenant_id },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[GET /api/auth/tenant] Error:', err)
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}

