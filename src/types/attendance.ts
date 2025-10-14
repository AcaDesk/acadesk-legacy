import { z } from 'zod';

// Attendance status enum
export const AttendanceStatus = {
  PRESENT: 'present',
  LATE: 'late',
  ABSENT: 'absent',
  EXCUSED: 'excused',
} as const;

export type AttendanceStatusType = typeof AttendanceStatus[keyof typeof AttendanceStatus];

// Session status enum
export const SessionStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type SessionStatusType = typeof SessionStatus[keyof typeof SessionStatus];

// Database types
export interface AttendanceSession {
  id: string;
  tenant_id: string;
  class_id: string;
  session_date: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  actual_start_at?: string;
  actual_end_at?: string;
  status: SessionStatusType;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  tenant_id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatusType;
  check_in_at?: string;
  check_out_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Form validation schemas
export const createSessionSchema = z.object({
  class_id: z.string().uuid('유효한 클래스를 선택해주세요'),
  session_date: z.string().min(1, '날짜를 선택해주세요'),
  scheduled_start_at: z.string().min(1, '시작 시간을 입력해주세요'),
  scheduled_end_at: z.string().min(1, '종료 시간을 입력해주세요'),
  notes: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.scheduled_start_at);
  const end = new Date(data.scheduled_end_at);
  return end > start;
}, {
  message: '종료 시간은 시작 시간보다 늦어야 합니다',
  path: ['scheduled_end_at'],
});

export const updateAttendanceSchema = z.object({
  status: z.enum(["present", "late", "absent", "excused"], {
    required_error: "출석 상태를 선택해주세요",
    invalid_type_error: "올바른 출석 상태를 선택해주세요"
  }),  notes: z.string().max(500, '메모는 500자 이내로 입력해주세요').optional(),
}).refine((data) => {
  if (data.check_in_at && data.check_out_at) {
    const checkIn = new Date(data.check_in_at);
    const checkOut = new Date(data.check_out_at);
    return checkOut > checkIn;
  }
  return true;
}, {
  message: '퇴실 시간은 입실 시간보다 늦어야 합니다',
  path: ['check_out_at'],
});

export const bulkAttendanceSchema = z.object({
  session_id: z.string().uuid('유효한 세션을 선택해주세요'),
  attendances: z.array(
    z.object({
      student_id: z.string().uuid(),
      status: z.enum(['present', 'late', 'absent', 'excused']),
      check_in_at: z.string().optional(),
      notes: z.string().max(500).optional(),
    })
  ).min(1, '최소 1명 이상의 출석을 기록해주세요'),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

// Extended types with relations
export interface AttendanceSessionWithClass extends AttendanceSession {
  class: {
    id: string;
    name: string;
  };
}

export interface AttendanceWithStudent extends Attendance {
  student: {
    id: string;
    name: string;
    student_number?: string;
  };
}
