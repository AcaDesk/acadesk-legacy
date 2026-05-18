/**
 * 학생 진급 관리 페이지
 *
 * - 진급은 학생 정보를 대량 변경하므로 owner/instructor 만 접근 가능
 * - assistant 는 SSR 단계에서 안내 화면 표시 (Server Action 측에서도 verifyRole 로 이중 차단)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { PromotionWizard } from '@/components/features/students/promotion/promotion-wizard'
import { Card, CardContent } from '@ui/card'

// Edge 런타임 방지 - service_role 은 Node.js 에서만 작동
export const runtime = 'nodejs'

export const metadata = {
  title: '진급 관리 | Acadesk',
  description: '학년 진급 일괄 처리',
}

export default async function StudentPromotionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const admin = createServiceRoleClient()
  const { data: userData } = await admin
    .from('users')
    .select('role_code')
    .eq('id', user.id)
    .maybeSingle()

  const role = userData?.role_code
  if (role !== 'owner' && role !== 'instructor') {
    return (
      <PageWrapper
        title="진급 관리"
        description="학년이 바뀔 때 학생 학년·학교 정보를 일괄 업데이트합니다."
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex h-[40vh] items-center justify-center">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">접근 권한 없음</h2>
                <p className="text-sm text-muted-foreground">
                  진급 일괄 처리는 원장 또는 강사 권한이 필요합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="진급 관리" description="학년이 바뀔 때 학생 학년·학교 정보를 일괄 업데이트합니다.">
      <PromotionWizard />
    </PageWrapper>
  )
}
