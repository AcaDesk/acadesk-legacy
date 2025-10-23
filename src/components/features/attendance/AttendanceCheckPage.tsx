'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceCheckDialog } from './attendance-check-dialog';
import { ContactGuardianDialog } from './contact-guardian-dialog';
import { ClipboardCheck, Clock, Play, CheckCircle2, Send, Users, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handlers';
import {
  createUpdateAttendanceSessionStatusUseCase,
  createBulkNotifyAbsentStudentsUseCase,
} from '@/application/factories/attendanceUseCaseFactory.client';
import type {
  AttendanceSessionWithClass,
  AttendanceWithStudent,
} from '@/types/attendance';

interface AttendanceCheckPageProps {
  session: AttendanceSessionWithClass;
  students: Array<{
    id: string;
    student_code: string;
    users: {
      name: string;
    } | null;
  }>;
  existingRecords: AttendanceWithStudent[];
  tenantId?: string;
}

export function AttendanceCheckPage({
  session,
  students,
  existingRecords,
}: AttendanceCheckPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [updating, setUpdating] = useState(false);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const sessionStart = new Date(session.scheduled_start_at);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
      setElapsedTime(elapsed > 0 ? elapsed : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [session.scheduled_start_at]);

  const handleSuccess = () => {
    router.refresh();
  };

  const handleContactGuardian = (studentId: string, studentName: string) => {
    setSelectedStudent({ id: studentId, name: studentName });
    setContactDialogOpen(true);
  };

  const handleStartSession = async () => {
    setUpdating(true);
    try {
      // Use Case를 통한 세션 상태 업데이트
      const useCase = createUpdateAttendanceSessionStatusUseCase();
      await useCase.execute(
        session.id,
        'in_progress',
        new Date().toISOString()
      );

      toast({
        title: '수업 시작',
        description: '수업이 시작되었습니다.',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: '오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteSession = async () => {
    setUpdating(true);
    try {
      // Use Case를 통한 세션 상태 업데이트
      const useCase = createUpdateAttendanceSessionStatusUseCase();
      await useCase.execute(
        session.id,
        'completed',
        undefined,
        new Date().toISOString()
      );

      toast({
        title: '수업 종료',
        description: '수업이 종료되었습니다.',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: '오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkNotifyAbsent = async () => {
    const absentStudents = students.filter(student => {
      const record = existingRecords.find(r => r.student_id === student.id);
      return record?.status === 'absent' || !record;
    });

    if (absentStudents.length === 0) {
      toast({
        title: '알림',
        description: '결석 학생이 없습니다.',
      });
      return;
    }

    if (!confirm(`${absentStudents.length}명의 보호자에게 결석 알림을 전송하시겠습니까?`)) {
      return;
    }

    toast({
      title: '전송 중',
      description: `${absentStudents.length}명의 보호자에게 알림을 전송하고 있습니다...`,
    });

    try {
      // Use Case를 통한 일괄 알림 전송
      const useCase = createBulkNotifyAbsentStudentsUseCase();
      const notifications = absentStudents.map(student => ({
        student_id: student.id,
        student_name: student.users?.name || '학생',
        session_id: session.id,
        session_date: format(new Date(session.session_date), 'M월 d일', { locale: ko }),
      }));

      const { successCount, error } = await useCase.execute(notifications);

      if (error) throw error;

      toast({
        title: '전송 완료',
        description: `${successCount}명의 보호자에게 알림이 전송되었습니다.`,
      });

      router.refresh();
    } catch (error) {
      toast({
        title: '전송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
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

  const attendanceStats = {
    total: students.length,
    present: existingRecords.filter(r => r.status === 'present').length,
    late: existingRecords.filter(r => r.status === 'late').length,
    absent: existingRecords.filter(r => r.status === 'absent').length,
    excused: existingRecords.filter(r => r.status === 'excused').length,
  };

  const sessionStarted = new Date(session.scheduled_start_at) < new Date();
  const absentCount = students.length - existingRecords.length + attendanceStats.absent;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push('/attendance')}
          className="hover:text-foreground transition-colors"
        >
          출석 관리
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{session.class?.name || 'Unknown Class'}</span>
      </nav>

      {/* Header with Timer */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{session.class?.name || 'Unknown Class'}</h1>
          <p className="text-muted-foreground">
            {format(new Date(session.session_date), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
          </p>
        </div>

        {/* Session Timer */}
        {sessionStarted && session.status !== 'completed' && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">경과 시간</p>
                  <p className="text-2xl font-mono font-bold text-blue-600">
                    {formatElapsedTime(elapsedTime)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Session Controls */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              전체 학생
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceStats.total}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">출석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{attendanceStats.present}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">지각</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{attendanceStats.late}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">결석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{attendanceStats.absent}명</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        {session.status === 'scheduled' && (
          <Button
            size="lg"
            onClick={handleStartSession}
            disabled={updating}
            className="gap-2"
          >
            <Play className="h-5 w-5" />
            수업 시작
          </Button>
        )}

        <Button
          size="lg"
          onClick={() => setDialogOpen(true)}
          className="gap-2"
        >
          <ClipboardCheck className="h-5 w-5" />
          출석 체크
        </Button>

        {absentCount > 0 && (
          <Button
            size="lg"
            variant="outline"
            onClick={handleBulkNotifyAbsent}
            className="gap-2"
          >
            <Send className="h-5 w-5" />
            결석 알림 ({absentCount}명)
          </Button>
        )}

        {session.status === 'in_progress' && (
          <Button
            size="lg"
            variant="secondary"
            onClick={handleCompleteSession}
            disabled={updating}
            className="gap-2"
          >
            <CheckCircle2 className="h-5 w-5" />
            수업 종료
          </Button>
        )}
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>학생 목록</CardTitle>
            {getStatusBadge(session.status)}
          </div>
        </CardHeader>
        <CardContent>
          {students.length > 0 ? (
            <div className="grid gap-2">
              {students.map((student) => {
                const record = existingRecords.find((r) => r.student_id === student.id);
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-lg">
                          {student.users?.name || '이름 없음'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {student.student_code}
                        </div>
                      </div>
                    </div>
                    <div>
                      {record ? (
                        <Badge
                          className="text-sm py-1 px-3"
                          variant={
                            record.status === 'present' ? 'default' :
                            record.status === 'late' ? 'secondary' :
                            record.status === 'absent' ? 'destructive' :
                            'outline'
                          }
                        >
                          {record.status === 'present' ? '출석' :
                           record.status === 'late' ? '지각' :
                           record.status === 'absent' ? '결석' :
                           record.status === 'excused' ? '결석(사유)' :
                           record.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-sm py-1 px-3">미체크</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>이 수업에 등록된 학생이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Check Dialog */}
      <AttendanceCheckDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sessionId={session.id}
        sessionStartTime={session.scheduled_start_at}
        students={students}
        existingRecords={existingRecords.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          notes: r.notes || '',
          checked_at: r.check_in_at ?? null,
        }))}
        onSuccess={handleSuccess}
        onContactGuardian={handleContactGuardian}
      />

      {/* Contact Guardian Dialog */}
      {selectedStudent && (
        <ContactGuardianDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          sessionId={session.id}
          onContactLogged={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
