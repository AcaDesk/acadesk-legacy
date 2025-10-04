'use client';

import { useState } from 'react';
import { AttendanceStatus } from '@/types/attendance';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Student {
  id: string;
  name: string;
  student_number?: string;
}

interface AttendanceRecord {
  student_id: string;
  status: string;
  check_in_at?: string;
  notes?: string;
}

interface AttendanceCheckFormProps {
  students: Student[];
  existingRecords?: AttendanceRecord[];
  onSubmit: (
    records: Array<{
      student_id: string;
      status: string;
      check_in_at?: string;
      notes?: string;
    }>
  ) => Promise<void>;
}

export function AttendanceCheckForm({
  students,
  existingRecords = [],
  onSubmit,
}: AttendanceCheckFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize attendance state
  const [attendanceState, setAttendanceState] = useState<
    Record<
      string,
      {
        status: string;
        notes: string;
      }
    >
  >(() => {
    const initial: Record<string, { status: string; notes: string }> = {};

    students.forEach((student) => {
      const existing = existingRecords.find((r) => r.student_id === student.id);
      initial[student.id] = {
        status: existing?.status || AttendanceStatus.PRESENT,
        notes: existing?.notes || '',
      };
    });

    return initial;
  });

  const updateStatus = (studentId: string, status: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const updateNotes = (studentId: string, notes: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const records = students.map((student) => {
        const state = attendanceState[student.id];
        return {
          student_id: student.id,
          status: state.status,
          check_in_at:
            state.status === AttendanceStatus.PRESENT ||
            state.status === AttendanceStatus.LATE
              ? new Date().toISOString()
              : undefined,
          notes: state.notes || undefined,
        };
      });

      await onSubmit(records);
    } catch (error) {
      console.error('Failed to submit attendance:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: AttendanceStatus.PRESENT, label: '출석', color: 'bg-green-100 text-green-800' },
    { value: AttendanceStatus.LATE, label: '지각', color: 'bg-yellow-100 text-yellow-800' },
    { value: AttendanceStatus.ABSENT, label: '결석', color: 'bg-red-100 text-red-800' },
    { value: AttendanceStatus.EXCUSED, label: '사유', color: 'bg-blue-100 text-blue-800' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {students.map((student) => {
          const state = attendanceState[student.id];

          return (
            <div
              key={student.id}
              className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-lg">{student.name}</h4>
                  {student.student_number && (
                    <p className="text-sm text-gray-500">
                      학번: {student.student_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    출석 상태 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateStatus(student.id, option.value)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          state.status === option.value
                            ? option.color + ' ring-2 ring-offset-2 ring-blue-500'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(state.status === AttendanceStatus.ABSENT ||
                  state.status === AttendanceStatus.EXCUSED ||
                  state.status === AttendanceStatus.LATE) && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      메모 {state.status === AttendanceStatus.EXCUSED && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <Textarea
                      value={state.notes}
                      onChange={(e) => updateNotes(student.id, e.target.value)}
                      placeholder={
                        state.status === AttendanceStatus.EXCUSED
                          ? '사유를 입력해주세요'
                          : '메모를 입력하세요 (선택사항)'
                      }
                      rows={2}
                      maxLength={500}
                      className={
                        state.status === AttendanceStatus.EXCUSED && !state.notes
                          ? 'border-red-500'
                          : ''
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {state.notes.length}/500
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {students.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          이 세션에 등록된 학생이 없습니다.
        </div>
      )}

      {students.length > 0 && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? '저장 중...' : `출석 저장 (${students.length}명)`}
          </Button>
        </div>
      )}
    </form>
  );
}
