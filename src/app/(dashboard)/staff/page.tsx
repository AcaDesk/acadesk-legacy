import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { StaffManagementClient } from "./staff-management-client"
import { PageWrapper } from "@/components/layout/page-wrapper"

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const supabase = await createClient()

  // 현재 사용자 정보 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <PageWrapper>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">로그인이 필요합니다</h2>
          </div>
        </div>
      </PageWrapper>
    )
  }

  // 사용자의 tenant_id와 role 가져오기
  const { data: userData } = await supabase
    .from("users")
    .select("tenant_id, role_code")
    .eq("id", user.id)
    .single()

  // 원장만 접근 가능
  if (!userData || userData.role_code !== "owner") {
    return (
      <PageWrapper>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">접근 권한 없음</h2>
            <p className="mt-2 text-muted-foreground">
              원장만 직원 관리 기능을 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </PageWrapper>
    )
  }

  // 직원 목록 가져오기
  const { data: staffList } = await supabase
    .from("users")
    .select("id, name, email, role_code, phone, created_at")
    .eq("tenant_id", userData.tenant_id)
    .in("role_code", ["instructor", "assistant"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // 초대 목록 가져오기
  const { data: invitations } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("tenant_id", userData.tenant_id)
    .order("created_at", { ascending: false })

  return (
    <PageWrapper>
      <Suspense fallback={<div>Loading...</div>}>
        <StaffManagementClient
          staffList={staffList || []}
          invitations={invitations || []}
        />
      </Suspense>
    </PageWrapper>
  )
}
