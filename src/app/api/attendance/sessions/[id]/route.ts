import { NextRequest, NextResponse } from 'next/server';
import {
  createGetAttendanceSessionUseCase,
  createUpdateAttendanceSessionStatusUseCase,
  createDeleteAttendanceSessionUseCase
} from '@/application/factories/attendanceUseCaseFactory';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = await createGetAttendanceSessionUseCase();
    const session = await useCase.execute(id);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching attendance session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attendance session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, actual_start_at, actual_end_at } = body;

    const useCase = await createUpdateAttendanceSessionStatusUseCase();
    const session = await useCase.execute(id, status, actual_start_at, actual_end_at);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error updating attendance session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update attendance session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = await createDeleteAttendanceSessionUseCase();
    await useCase.execute(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attendance session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete attendance session' },
      { status: 500 }
    );
  }
}
