'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { AttendanceSessionForm } from './AttendanceSessionForm';
import type {
  AttendanceSessionWithClass,
  CreateSessionInput,
} from '@/core/types/attendance';
import { createAttendanceSession } from '@/app/actions/attendance';

interface AttendanceListProps {
  initialSessions: AttendanceSessionWithClass[];
  classes: Array<{ id: string; name: string }>;
  tenantId?: string;
}

export function AttendanceList({
  initialSessions,
  classes,
}: AttendanceListProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSession = async (data: CreateSessionInput) => {
    try {
      setIsCreating(true);
      setError(null);

      const result = await createAttendanceSession(data);

      if (!result.success || !result.data) {
        throw new Error(result.error || '출석 세션 생성 실패');
      }

      const newSession = result.data;

      // Get class info for the new session
      const sessionClass = classes.find((c) => c.id === newSession.class_id);

      setSessions([
        {
          ...newSession,
          class: sessionClass || { id: newSession.class_id, name: 'Unknown' },
        },
        ...sessions,
      ]);

      setShowCreateForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '출석 세션 생성 실패');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      scheduled: { variant: 'secondary', label: '예정' },
      in_progress: { variant: 'default', label: '진행중' },
      completed: { variant: 'outline', label: '완료' },
      cancelled: { variant: 'destructive', label: '취소' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Create Session Form */}
      {showCreateForm ? (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">출석 세션 생성</h2>
          <AttendanceSessionForm
            classes={classes}
            onSubmit={handleCreateSession}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">출석 세션 목록</h2>
            <p className="text-sm text-gray-600 mt-1">
              총 {sessions.length}개의 세션
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            + 새 세션 생성
          </Button>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg border text-center">
            <p className="text-gray-500">출석 세션이 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">
              새 세션을 생성하여 출석 관리를 시작하세요.
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {session.class?.name || 'Unknown Class'}
                    </h3>
                    {getStatusBadge(session.status)}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">날짜:</span>{' '}
                      {format(new Date(session.session_date), 'yyyy년 MM월 dd일 (EEE)', {
                        locale: ko,
                      })}
                    </p>
                    <p>
                      <span className="font-medium">시간:</span>{' '}
                      {format(new Date(session.scheduled_start_at), 'HH:mm')} -{' '}
                      {format(new Date(session.scheduled_end_at), 'HH:mm')}
                    </p>
                    {session.notes && (
                      <p>
                        <span className="font-medium">메모:</span> {session.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/attendance/${session.id}`)}
                  >
                    출석 체크
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
