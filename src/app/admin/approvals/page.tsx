import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { ApprovalManagementClient } from "./approval-management-client"

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const supabase = await createClient()

  // 현재 사용자 정보 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  // 슈퍼어드민 권한 체크
  const { data: userData } = await supabase
    .from("users")
    .select("is_super_admin")
    .eq("id", user.id)
    .single()

  if (!userData?.is_super_admin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">접근 권한 없음</h1>
          <p className="text-muted-foreground">
            이 페이지는 슈퍼어드민만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  // 승인 대기 중인 사용자 목록 가져오기
  const { data: pendingUsers } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      phone,
      role_code,
      approval_status,
      created_at,
      tenant_id,
      tenants (
        name,
        slug
      )
    `)
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false })

  // 최근 승인/거부된 사용자 목록
  const { data: recentDecisions } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      approval_status,
      approved_at,
      created_at,
      tenants (
        name
      )
    `)
    .in("approval_status", ["approved", "rejected"])
    .order("approved_at", { ascending: false })
    .limit(20)

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ApprovalManagementClient
        pendingUsers={pendingUsers || []}
        recentDecisions={recentDecisions || []}
        currentUserId={user.id}
      />
    </Suspense>
  )
}
