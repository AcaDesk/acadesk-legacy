import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type {
  AttendanceSession,
  Attendance,
  CreateSessionInput,
  UpdateAttendanceInput,
  AttendanceSessionWithClass,
  AttendanceWithStudent,
} from '@/types/attendance';
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

// Re-export types for use-cases
export type {
  CreateSessionInput,
  UpdateAttendanceInput,
  BulkAttendanceInput,
} from '@/types/attendance';

export class AttendanceRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }
  // ==================== Attendance Sessions ====================

  /**
   * Get all attendance sessions for a tenant
   */
  async getSessionsByTenant(
    tenantId: string,
    options?: {
      classId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): Promise<AttendanceSessionWithClass[]> {
    // Using this.dataSource

    let query = this.dataSource
      .from('attendance_sessions')
      .select(
        `
        *,
        class:classes (
          id,
          name
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('session_date', { ascending: false })
      .order('scheduled_start_at', { ascending: false });

    if (options?.classId) {
      query = query.eq('class_id', options.classId);
    }

    if (options?.startDate) {
      query = query.gte('session_date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('session_date', options.endDate);
    }

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as any[] || []) as AttendanceSessionWithClass[];
  }

  /**
   * Get attendance session by ID
   */
  async getSessionById(
    sessionId: string
  ): Promise<AttendanceSessionWithClass | null> {
    // Using this.dataSource

    const { data, error } = await this.dataSource
      .from('attendance_sessions')
      .select(
        `
        *,
        class:classes (
          id,
          name
        )
      `
      )
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
    return data;
  }

  /**
   * Create a new attendance session
   */
  async createSession(
    tenantId: string,
    input: CreateSessionInput
  ): Promise<AttendanceSession> {
    // Using this.dataSource

    const { data, error } = await this.dataSource
      .from('attendance_sessions')
      .insert({
        tenant_id: tenantId,
        class_id: input.class_id,
        session_date: input.session_date,
        scheduled_start_at: input.scheduled_start_at,
        scheduled_end_at: input.scheduled_end_at,
        notes: input.notes,
        status: 'scheduled',
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to create session');
    return data;
  }

  /**
   * Update attendance session status
   */
  async updateSessionStatus(
    sessionId: string,
    status: string,
    actualStartAt?: string,
    actualEndAt?: string
  ): Promise<AttendanceSession> {
    // Using this.dataSource

    const updateData: Record<string, unknown> = { status };

    if (actualStartAt) updateData.actual_start_at = actualStartAt;
    if (actualEndAt) updateData.actual_end_at = actualEndAt;

    const { data, error } = await this.dataSource
      .from('attendance_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to update session status');
    return data;
  }

  /**
   * Delete attendance session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Using this.dataSource

    const { error } = await this.dataSource
      .from('attendance_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  }

  // ==================== Attendance Records ====================

  /**
   * Get attendance records for a session
   */
  async getAttendanceBySession(
    sessionId: string
  ): Promise<AttendanceWithStudent[]> {
    // Using this.dataSource

    const { data, error } = await this.dataSource
      .from('attendance')
      .select(
        `
        *,
        student:students (
          id,
          name,
          student_number
        )
      `
      )
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as any[] || []) as AttendanceWithStudent[];
  }

  /**
   * Get attendance records for a student
   */
  async getAttendanceByStudent(
    studentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Attendance[]> {
    // Using this.dataSource

    let query = this.dataSource
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (options?.startDate || options?.endDate) {
      // Join with sessions to filter by date
      query = this.dataSource
        .from('attendance')
        .select(
          `
          *,
          session:attendance_sessions!inner (
            session_date
          )
        `
        )
        .eq('student_id', studentId);

      if (options?.startDate) {
        query = query.gte('session.session_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('session.session_date', options.endDate);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as any[] || []) as Attendance[];
  }

  /**
   * Create or update attendance record
   */
  async upsertAttendance(
    tenantId: string,
    sessionId: string,
    studentId: string,
    input: UpdateAttendanceInput
  ): Promise<Attendance> {
    // Using this.dataSource

    const { data, error } = await this.dataSource
      .from('attendance')
      .upsert(
        {
          tenant_id: tenantId,
          session_id: sessionId,
          student_id: studentId,
          status: input.status,
          check_in_at: input.check_in_at,
          check_out_at: input.check_out_at,
          notes: input.notes,
        },
        {
          onConflict: 'session_id,student_id',
        }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error upserting attendance:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to upsert attendance');
    return data;
  }

  /**
   * Bulk create/update attendance records
   */
  async bulkUpsertAttendance(
    tenantId: string,
    sessionId: string,
    attendances: Array<{
      student_id: string;
      status: string;
      check_in_at?: string;
      notes?: string;
    }>
  ): Promise<Attendance[]> {
    // Using this.dataSource

    const records = attendances.map((att) => ({
      tenant_id: tenantId,
      session_id: sessionId,
      student_id: att.student_id,
      status: att.status,
      check_in_at: att.check_in_at,
      notes: att.notes,
    }));

    const { data, error } = await this.dataSource
      .from('attendance')
      .upsert(records, {
        onConflict: 'session_id,student_id',
      })
      .select();

    if (error) throw error;
    return (data as any[] || []) as Attendance[];
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(attendanceId: string): Promise<void> {
    // Using this.dataSource

    const { error } = await this.dataSource
      .from('attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) throw error;
  }

  // ==================== Statistics ====================

  /**
   * Get attendance statistics for a student
   */
  async getStudentAttendanceStats(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendance_rate: number;
  }> {
    // Using this.dataSource

    let data, error;

    if (startDate || endDate) {
      let dateQuery = this.dataSource
        .from('attendance')
        .select(
          `
          status,
          session:attendance_sessions!inner (
            session_date
          )
        `
        )
        .eq('student_id', studentId);

      if (startDate) {
        dateQuery = dateQuery.gte('session.session_date', startDate);
      }

      if (endDate) {
        dateQuery = dateQuery.lte('session.session_date', endDate);
      }

      const result = await dateQuery;
      data = result.data;
      error = result.error;
    } else {
      const result = await this.dataSource
        .from('attendance')
        .select('status')
        .eq('student_id', studentId);
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    const attendanceData = (data || []) as Array<{ status: string }>;

    const stats = {
      total: attendanceData.length,
      present: attendanceData.filter((a) => a.status === 'present').length,
      late: attendanceData.filter((a) => a.status === 'late').length,
      absent: attendanceData.filter((a) => a.status === 'absent').length,
      excused: attendanceData.filter((a) => a.status === 'excused').length,
      attendance_rate: 0,
    };

    if (stats.total > 0) {
      stats.attendance_rate = ((stats.present + stats.late) / stats.total) * 100;
    }

    return stats;
  }
}
