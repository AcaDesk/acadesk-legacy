import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAttendanceSessions } from '@/app/actions/attendance';
import { getActiveClasses } from '@/app/actions/classes';
import { AttendanceList } from '@/components/features/attendance/AttendanceList';
import { FEATURES } from '@/lib/features.config';
import { ComingSoon } from '@/components/layout/coming-soon';
import { Maintenance } from '@/components/layout/maintenance';

export const metadata: Metadata = {
  title: "출석 관리",
  description: "수업별 출석 세션을 생성하고 학생들의 출석 현황을 관리합니다. 실시간 출석 체크, 지각/결석 기록, 출석률 통계를 확인하세요.",
}

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  // 피처 플래그 상태 체크
  const featureStatus = FEATURES.attendanceManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="출석 관리" description="실시간 출석 체크, 지각/결석 기록, 출석률 통계를 손쉽게 관리할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="출석 관리" reason="출석 시스템 개선 작업이 진행 중입니다." />;
  }

  try {
    // Get today's date for default filter
    const today = new Date().toISOString().split('T')[0];

    // Get recent sessions using Server Action
    const sessionsResult = await getAttendanceSessions({
      startDate: today,
    });

    if (!sessionsResult.success) {
      throw new Error(sessionsResult.error || '출석 세션을 불러올 수 없습니다');
    }

    // Get all active classes using Server Action
    const classesResult = await getActiveClasses();

    if (!classesResult.success) {
      throw new Error(classesResult.error || '클래스 목록을 불러올 수 없습니다');
    }

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 space-y-6">
          <h1 className="text-3xl font-bold">출석 관리</h1>
          <p className="text-gray-600">
            클래스별 출석 세션을 생성하고 학생들의 출석을 관리합니다.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-8">
              <p className="text-gray-500">로딩 중...</p>
            </div>
          }
        >
          <AttendanceList
            initialSessions={sessionsResult.data || []}
            classes={classesResult.data || []}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('Attendance page error:', error);
    throw error;
  }
}
