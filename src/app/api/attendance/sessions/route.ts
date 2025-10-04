import { NextRequest, NextResponse } from 'next/server';
import { AttendanceService } from '@/services/attendanceService';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userData?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id') || undefined;
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const status = searchParams.get('status') || undefined;

    const sessions = await AttendanceService.getSessionsByTenant(
      userData.tenant_id,
      {
        classId,
        startDate,
        endDate,
        status,
      }
    );

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching attendance sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attendance sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant_id
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!userData?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json();

    const session = await AttendanceService.createSession(
      userData.tenant_id,
      body
    );

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance session:', error);

    // Handle validation errors
    if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as { errors?: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create attendance session' },
      { status: 500 }
    );
  }
}
