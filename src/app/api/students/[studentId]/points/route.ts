import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(
  _req: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params
    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Temporary: use existing RPCs on the server with service_role
    // TODO: Replace with direct table queries and business logic without RPC.
    const [{ data: balance, error: balanceError }, { data: history, error: historyError }] =
      await Promise.all([
        supabase.rpc('get_student_point_balance', { p_student_id: studentId }),
        supabase.rpc('get_student_point_history', { p_student_id: studentId, p_limit: 20 }),
      ])

    if (balanceError) {
      throw balanceError
    }
    if (historyError) {
      throw historyError
    }

    return NextResponse.json({ balance: balance ?? 0, history: history ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[GET /api/students/[studentId]/points] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

