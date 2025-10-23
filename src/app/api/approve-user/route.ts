/**
 * POST /api/approve-user
 *
 * REMOVED: This endpoint has been replaced by Server Actions.
 * Use approveUser() or rejectUser() from @/app/actions/approve-user instead.
 * See: src/app/actions/approve-user.ts
 */

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been removed. Use Server Actions instead.',
      migration: {
        old: 'POST /api/approve-user',
        new: 'approveUser() or rejectUser() from @/app/actions/approve-user'
      }
    },
    { status: 410 } // 410 Gone
  )
}
