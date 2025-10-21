import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createGetAttendanceSessionsUseCase } from '@/application/factories/attendanceUseCaseFactory';
import { AttendanceList } from '@/components/features/attendance/AttendanceList';
import { FEATURES } from '@/lib/features.config';
import { ComingSoon } from '@/components/layout/coming-soon';
import { Maintenance } from '@/components/layout/maintenance';

export const metadata: Metadata = {
  title: "출석 관리",
  description: "수업별 출석 세션을 생성하고 학생들의 출석 현황을 관리합니다. 실시간 출석 체크, 지각/결석 기록, 출석률 통계를 확인하세요.",
}

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
    const useCase = await createGetAttendanceSessionsUseCase();
    const sessions = await useCase.execute(userData.tenant_id, {
      startDate: today,
    });

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
  } catch (error) {
    console.error('Attendance page error:', error);
    throw error;
  }
}
