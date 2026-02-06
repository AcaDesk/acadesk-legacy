import type { Metadata } from 'next';
import { PageHeader } from '@ui/page-header';
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary';
import { FEATURES } from '@/lib/features.config';
import { ComingSoon } from '@/components/layout/coming-soon';
import { Maintenance } from '@/components/layout/maintenance';
import { PAGE_ANIMATIONS } from '@/lib/animation-config';
import { AttendanceCheckPage } from '@/components/features/attendance/attendance-check-page';

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

  return (
    <PageErrorBoundary pageName="출석 관리">
      <div className="p-6 lg:p-8 space-y-6 h-full flex flex-col">
        {/* Header */}
        <section aria-label="페이지 헤더" className={PAGE_ANIMATIONS.header}>
          <PageHeader
            title="출석 관리"
            description="수업별 출석 세션을 생성하고 학생들의 출석 현황을 관리합니다"
          />
        </section>

        {/* Attendance Check */}
        <section
          aria-label="출석 체크"
          className={`flex-1 min-h-0 ${PAGE_ANIMATIONS.getSection(0).className}`}
          style={PAGE_ANIMATIONS.getSection(0).style}
        >
          <SectionErrorBoundary sectionName="출석 체크">
            <AttendanceCheckPage />
          </SectionErrorBoundary>
        </section>
      </div>
    </PageErrorBoundary>
  );
}
