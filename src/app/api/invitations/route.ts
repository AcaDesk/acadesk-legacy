import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InviteStaffUseCase } from '@/application/use-cases/invitation/InviteStaffUseCase';
import { GetInvitationsUseCase } from '@/application/use-cases/invitation/GetInvitationsUseCase';
import { CancelInvitationUseCase } from '@/application/use-cases/invitation/CancelInvitationUseCase';

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
 * Invite a new staff member
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, roleCode } = body;

    if (!email || !roleCode) {
      return NextResponse.json(
        { error: 'Email and roleCode are required' },
        { status: 400 }
      );
    }

    const useCase = new InviteStaffUseCase();
    const result = await useCase.execute({ email, roleCode });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error inviting staff:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invite staff' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invitations
 * Cancel an invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    const useCase = new CancelInvitationUseCase();
    await useCase.execute(invitationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
