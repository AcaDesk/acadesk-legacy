import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAttendanceSessions } from '@/app/actions/attendance';
import { getActiveClasses } from '@/app/actions/classes';
import { AttendanceList } from '@/components/features/attendance/AttendanceList';
import { PageHeader } from '@ui/page-header';
import { Card, CardContent } from '@ui/card';
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary';
import { FEATURES } from '@/lib/features.config';
import { ComingSoon } from '@/components/layout/coming-soon';
import { Maintenance } from '@/components/layout/maintenance';
import { PAGE_ANIMATIONS } from '@/lib/animation-config';
import { LoadingState } from '@/components/ui/loading-state';

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

  // Get today's date for default filter
  const today = new Date().toISOString().split('T')[0];

  // Get recent sessions using Server Action
  const sessionsResult = await getAttendanceSessions({
    startDate: today,
  });

  // Get all active classes using Server Action
  const classesResult = await getActiveClasses();

  // Handle errors with clear messaging
  if (!sessionsResult.success || !classesResult.success) {
    const errorMessage = sessionsResult.error || classesResult.error || '데이터를 불러올 수 없습니다';

    return (
      <PageErrorBoundary pageName="출석 관리">
        <div className="p-6 lg:p-8 space-y-6">
          <section aria-label="페이지 헤더" className={PAGE_ANIMATIONS.header}>
            <PageHeader
              title="출석 관리"
              description="수업별 출석 세션을 생성하고 학생들의 출석 현황을 관리합니다"
            />
          </section>

          <section aria-label="오류 메시지" {...PAGE_ANIMATIONS.getSection(0)}>
            <Card>
              <CardContent className="pt-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-yellow-800 mb-2">
                    데이터 로딩 오류
                  </h2>
                  <p className="text-yellow-700 mb-4">{errorMessage}</p>
                  <p className="text-sm text-yellow-600">
                    {!sessionsResult.success && '• 출석 세션 로딩 실패'}
                    {!sessionsResult.success && !classesResult.success && <br />}
                    {!classesResult.success && '• 클래스 목록 로딩 실패'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary pageName="출석 관리">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section aria-label="페이지 헤더" className={PAGE_ANIMATIONS.header}>
          <PageHeader
            title="출석 관리"
            description="수업별 출석 세션을 생성하고 학생들의 출석 현황을 관리합니다"
          />
        </section>

        {/* Attendance List */}
        <section aria-label="출석 목록" {...PAGE_ANIMATIONS.getSection(0)}>
          <SectionErrorBoundary sectionName="출석 목록">
            <Suspense
              fallback={<LoadingState variant="card" message="출석 목록을 불러오는 중..." />}
            >
              <AttendanceList
                initialSessions={sessionsResult.data || []}
                classes={classesResult.data || []}
              />
            </Suspense>
          </SectionErrorBoundary>
        </section>
      </div>
    </PageErrorBoundary>
  );
}
