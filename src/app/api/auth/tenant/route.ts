import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const cookieStore = await cookies()
    // Use SSR client to read current auth session
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      throw error || new Error('User not found')
    }

    return NextResponse.json({ tenantId: data.tenant_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[GET /api/auth/tenant] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

