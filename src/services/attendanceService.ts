import { AttendanceRepository } from '@/repositories/attendanceRepository';
import type {
  CreateSessionInput,
  UpdateAttendanceInput,
  BulkAttendanceInput,
} from '@/types/attendance';
import {
  createSessionSchema,
  updateAttendanceSchema,
  bulkAttendanceSchema,
} from '@/types/attendance';

export class AttendanceService {
  /**
   * Get attendance sessions with validation
   */
  static async getSessionsByTenant(
    tenantId: string,
    options?: {
      classId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    return await AttendanceRepository.getSessionsByTenant(tenantId, options);
  }

  /**
   * Get attendance session by ID
   */
  static async getSessionById(sessionId: string) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const session = await AttendanceRepository.getSessionById(sessionId);

    if (!session) {
      throw new Error('Attendance session not found');
    }

    return session;
  }

  /**
   * Create attendance session with validation
   */
  static async createSession(tenantId: string, input: CreateSessionInput) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Validate input
    const validated = createSessionSchema.parse(input);

    // Validate that session date is not in the future beyond reasonable limit
    const sessionDate = new Date(validated.session_date);
    const today = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 3); // 3 months ahead

    if (sessionDate > maxFutureDate) {
      throw new Error('세션 날짜는 3개월 이내로 설정해주세요');
    }

    // Create session
    return await AttendanceRepository.createSession(tenantId, validated);
  }

  /**
   * Update session status
   */
  static async updateSessionStatus(
    sessionId: string,
    status: string,
    actualStartAt?: string,
    actualEndAt?: string
  ) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid session status');
    }

    // Validate times if provided
    if (actualStartAt && actualEndAt) {
      const start = new Date(actualStartAt);
      const end = new Date(actualEndAt);

      if (end <= start) {
        throw new Error('실제 종료 시간은 시작 시간보다 늦어야 합니다');
      }
    }

    return await AttendanceRepository.updateSessionStatus(
      sessionId,
      status,
      actualStartAt,
      actualEndAt
    );
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    return await AttendanceRepository.deleteSession(sessionId);
  }

  /**
   * Get attendance records for a session
   */
  static async getAttendanceBySession(sessionId: string) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    return await AttendanceRepository.getAttendanceBySession(sessionId);
  }

  /**
   * Get attendance records for a student
   */
  static async getAttendanceByStudent(
    studentId: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ) {
    if (!studentId) {
      throw new Error('Student ID is required');
    }

    return await AttendanceRepository.getAttendanceByStudent(studentId, options);
  }

  /**
   * Upsert single attendance record with validation
   */
  static async upsertAttendance(
    tenantId: string,
    sessionId: string,
    studentId: string,
    input: UpdateAttendanceInput
  ) {
    if (!tenantId || !sessionId || !studentId) {
      throw new Error('Tenant ID, Session ID, and Student ID are required');
    }

    // Validate input
    const validated = updateAttendanceSchema.parse(input);

    // Auto-set check_in_at for present/late status if not provided
    if (
      (validated.status === 'present' || validated.status === 'late') &&
      !validated.check_in_at
    ) {
      validated.check_in_at = new Date().toISOString();
    }

    return await AttendanceRepository.upsertAttendance(
      tenantId,
      sessionId,
      studentId,
      validated
    );
  }

  /**
   * Bulk upsert attendance records with validation
   */
  static async bulkUpsertAttendance(tenantId: string, input: BulkAttendanceInput) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Validate input
    const validated = bulkAttendanceSchema.parse(input);

    // Auto-set check_in_at for present/late students
    const attendances = validated.attendances.map((att) => {
      if (
        (att.status === 'present' || att.status === 'late') &&
        !att.check_in_at
      ) {
        return {
          ...att,
          check_in_at: new Date().toISOString(),
        };
      }
      return att;
    });

    return await AttendanceRepository.bulkUpsertAttendance(
      tenantId,
      validated.session_id,
      attendances
    );
  }

  /**
   * Delete attendance record
   */
  static async deleteAttendance(attendanceId: string) {
    if (!attendanceId) {
      throw new Error('Attendance ID is required');
    }

    return await AttendanceRepository.deleteAttendance(attendanceId);
  }

  /**
   * Get student attendance statistics
   */
  static async getStudentAttendanceStats(
    studentId: string,
    startDate?: string,
    endDate?: string
  ) {
    if (!studentId) {
      throw new Error('Student ID is required');
    }

    return await AttendanceRepository.getStudentAttendanceStats(
      studentId,
      startDate,
      endDate
    );
  }
}
