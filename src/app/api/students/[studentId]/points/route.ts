/**
 * Student Points API Route
 *
 * ✅ Migrated to Server Actions
 * This route now uses Server Actions instead of RPC functions
 */

import { NextResponse } from 'next/server'
import { getStudentPointBalance, getStudentPointHistory } from '@/app/actions/students'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params
    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    // Use Server Actions instead of RPC
    const [balanceResult, historyResult] = await Promise.all([
      getStudentPointBalance(studentId),
      getStudentPointHistory(studentId, 20),
    ])

    if (!balanceResult.success) {
      return NextResponse.json(
        { error: balanceResult.error || 'Failed to get point balance' },
        { status: 500 }
      )
    }

    if (!historyResult.success) {
      return NextResponse.json(
        { error: historyResult.error || 'Failed to get point history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      balance: balanceResult.data ?? 0,
      history: historyResult.data ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    console.error('[GET /api/students/[studentId]/points] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

