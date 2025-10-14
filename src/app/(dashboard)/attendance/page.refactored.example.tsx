/**
 * 리팩토링 예시: 출석 관리 페이지
 *
 * Before: if 문으로 피처 상태 분기 (17-26줄)
 * After: FeatureGuard 컴포넌트 사용
 *
 * 변경 사항:
 * 1. ComingSoon, Maintenance import 제거
 * 2. FeatureGuard import 추가
 * 3. if 문 제거
 * 4. 로직을 별도 컴포넌트로 분리하여 FeatureGuard로 감싸기
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AttendanceRepository } from '@/services/data/attendance.repository';
import { AttendanceList } from '@/components/features/attendance/AttendanceList';
import { FeatureGuard } from '@/components/features/FeatureGuard';

export const metadata: Metadata = {
  title: "출석 관리",
  description: "수업별 출석 세션을 생성하고 학생들의 출석 현황을 관리합니다. 실시간 출석 체크, 지각/결석 기록, 출석률 통계를 확인하세요.",
}

// ✨ 실제 기능 로직을 별도 컴포넌트로 분리
async function AttendancePageContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's tenant
  const { data: userDataTemp, error: userError } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  let userData = userDataTemp;

  if (userError) {
    console.error('Error fetching user data:', userError);
    throw new Error(`Failed to fetch user data: ${userError.message}`);
  }

  // If user doesn't exist in public.users, create it
  if (!userData) {
    console.log('Creating user in public.users for auth user:', user.id);
    const { data: newUserData, error: createError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        tenant_id: 'a0000000-0000-0000-0000-000000000001', // Default tenant
        email: user.email,
        name: user.email?.split('@')[0] || 'User',
        role_code: 'admin',
      })
      .select('tenant_id')
      .maybeSingle();

    if (createError) {
      console.error('Error creating user:', createError);
      redirect('/auth/login');
    }

    userData = newUserData;
  }

  if (!userData) {
    console.error('User data not found for user:', user.id);
    redirect('/auth/login');
  }

  if (!userData.tenant_id) {
    console.error('User has no tenant_id:', user.id);
    redirect('/auth/login');
  }

  // Get today's date for default filter
  const today = new Date().toISOString().split('T')[0];

  // Get recent sessions
  const sessions = await AttendanceRepository.getSessionsByTenant(
    userData.tenant_id,
    {
      startDate: today,
    }
  );

  // Get all classes for the dropdown
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('tenant_id', userData.tenant_id)
    .eq('active', true)
    .order('name');

  if (classesError) {
    console.error('Error fetching classes:', classesError);
    throw new Error(`Failed to fetch classes: ${classesError.message}`);
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
          initialSessions={sessions}
          classes={classes || []}
          tenantId={userData.tenant_id}
        />
      </Suspense>
    </div>
  );
}

// ✅ 개선된 메인 페이지 컴포넌트
export default async function AttendancePage() {
  return (
    <FeatureGuard
      feature="attendanceManagement"
      featureName="출석 관리"
      description="실시간 출석 체크, 지각/결석 기록, 출석률 통계를 손쉽게 관리할 수 있는 기능을 준비하고 있습니다."
      reason="출석 시스템 개선 작업이 진행 중입니다."
    >
      <AttendancePageContent />
    </FeatureGuard>
  );
}

/**
 * 📊 비교 분석
 *
 * ## Before (기존 방식)
 * - 총 라인 수: ~137줄
 * - if 문: 2개 (17-26줄)
 * - import: ComingSoon, Maintenance 필요
 * - 유지보수: 새 상태 추가 시 이 파일 수정 필요
 *
 * ## After (개선된 방식)
 * - 총 라인 수: ~142줄 (약간 증가하지만 가독성 향상)
 * - if 문: 0개
 * - import: FeatureGuard만 필요
 * - 유지보수: 새 상태 추가 시 이 파일 수정 불필요
 *
 * ## 장점
 * 1. ✅ 선언적이고 명확한 의도
 * 2. ✅ 피처 상태 로직과 비즈니스 로직 완전 분리
 * 3. ✅ 새로운 상태 추가 시 이 파일 수정 불필요
 * 4. ✅ 테스트가 더 쉬워짐 (Mock FeatureGuard)
 * 5. ✅ 일관된 패턴으로 모든 페이지 적용 가능
 *
 * ## 추가 개선 가능성
 * - estimatedTime prop 추가하여 점검 완료 시간 표시
 * - beta 상태일 때도 자동으로 배지 표시
 * - deprecated 상태일 때도 자동으로 경고 표시
 */
