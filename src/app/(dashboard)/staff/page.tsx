import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { StaffManagementClient } from "./staff-management-client"
import { PageHeader } from '@ui/page-header'
import { Card, CardContent } from '@ui/card'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'

// Edge 런타임 방지 - service_role은 Node.js에서만 작동
export const runtime = 'nodejs'
// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  // 1. 세션 확인 (일반 클라이언트)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 2. 사용자의 tenant_id와 role 가져오기 (service_role - RLS 우회)
  const admin = createServiceRoleClient()
  const { data: userData } = await admin
    .from("users")
    .select("tenant_id, role_code")
    .eq("id", user.id)
    .single()

  // 원장만 접근 가능
  if (!userData || userData.role_code !== "owner") {
    return (
      <PageErrorBoundary pageName="직원 관리">
        <div className="p-6 lg:p-8 space-y-6">
          <section aria-label="페이지 헤더" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
            <PageHeader
              title="직원 관리"
              description="학원 직원을 초대하고 관리합니다"
            />
          </section>
          <section aria-label="접근 권한" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex h-[40vh] items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold">접근 권한 없음</h2>
                    <p className="mt-2 text-muted-foreground">
                      원장만 직원 관리 기능을 사용할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </PageErrorBoundary>
    )
  }

  // 3. 직원 목록 가져오기 (service_role - RLS 우회)
  const { data: staffList } = await admin
    .from("users")
    .select("id, name, email, role_code, phone, created_at")
    .eq("tenant_id", userData.tenant_id)
    .in("role_code", ["instructor", "assistant"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // 4. 초대 목록 가져오기 (일반 클라이언트 - staff_invitations는 RLS 적용)
  const { data: invitations } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("tenant_id", userData.tenant_id)
    .order("created_at", { ascending: false })

  return (
    <PageErrorBoundary pageName="직원 관리">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section aria-label="페이지 헤더" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
          <PageHeader
            title="직원 관리"
            description="학원 직원을 초대하고 관리합니다"
          />
        </section>

        {/* Staff Management Content */}
        <section aria-label="직원 목록" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
          <SectionErrorBoundary sectionName="직원 관리">
            <Suspense
              fallback={
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">로딩 중...</p>
                    </div>
                  </CardContent>
                </Card>
              }
            >
              <StaffManagementClient
                staffList={staffList || []}
                invitations={invitations || []}
              />
            </Suspense>
          </SectionErrorBoundary>
        </section>
      </div>
    </PageErrorBoundary>
  )
}
