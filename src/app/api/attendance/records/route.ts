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

    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('session_id');
    const studentId = searchParams.get('student_id');

    if (!sessionId && !studentId) {
      return NextResponse.json(
        { error: 'Either session_id or student_id is required' },
        { status: 400 }
      );
    }

    let records;

    if (sessionId) {
      records = await AttendanceService.getAttendanceBySession(sessionId);
    } else if (studentId) {
      const startDate = searchParams.get('start_date') || undefined;
      const endDate = searchParams.get('end_date') || undefined;
      records = await AttendanceService.getAttendanceByStudent(studentId, {
        startDate,
        endDate,
      });
    }

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attendance records' },
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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userData.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json();

    // Check if it's bulk update or single update
    if (body.attendances && Array.isArray(body.attendances)) {
      // Bulk update
      const records = await AttendanceService.bulkUpsertAttendance(
        userData.tenant_id,
        body
      );
      return NextResponse.json(records, { status: 201 });
    } else {
      // Single update
      const { session_id, student_id, ...attendanceData } = body;

      if (!session_id || !student_id) {
        return NextResponse.json(
          { error: 'session_id and student_id are required' },
          { status: 400 }
        );
      }

      const record = await AttendanceService.upsertAttendance(
        userData.tenant_id,
        session_id,
        student_id,
        attendanceData
      );
      return NextResponse.json(record, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating/updating attendance:', error);

    // Handle validation errors
    if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as { errors?: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create/update attendance' },
      { status: 500 }
    );
  }
}
