/**
 * POST/DELETE /api/invitations
 *
 * REMOVED: POST and DELETE have been replaced by Server Actions.
 * - Use inviteStaff() from @/app/actions/invitations for POST
 * - Use cancelInvitation() from @/app/actions/invitations for DELETE
 * See: src/app/actions/invitations.ts
 *
 * GET is still available for reading invitations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GetInvitationsUseCase } from '@/application/use-cases/invitation/GetInvitationsUseCase';

/**
 * GET /api/invitations
 * Get all invitations for the current tenant
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = new GetInvitationsUseCase();
    const invitations = await useCase.execute();

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invitations
 * REMOVED - Use Server Action instead
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been removed. Use Server Actions instead.',
      migration: {
        old: 'POST /api/invitations',
        new: 'inviteStaff() from @/app/actions/invitations'
      }
    },
    { status: 410 } // 410 Gone
  )
}

/**
 * DELETE /api/invitations
 * REMOVED - Use Server Action instead
 */
export async function DELETE() {
  return NextResponse.json(
    {
      error: 'This endpoint has been removed. Use Server Actions instead.',
      migration: {
        old: 'DELETE /api/invitations',
        new: 'cancelInvitation() from @/app/actions/invitations'
      }
    },
    { status: 410 } // 410 Gone
  )
}
