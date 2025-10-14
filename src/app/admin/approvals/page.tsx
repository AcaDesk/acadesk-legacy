import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { ApprovalManagementClient } from "./approval-management-client"

export default async function ApprovalsPage() {
  const supabase = await createClient()

  // 현재 사용자 정보 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  // TODO: 실제 환경에서는 슈퍼어드민 권한 체크 필요
  // 예: user.email이 특정 도메인이거나, user_metadata에 is_super_admin 플래그가 있는지 확인

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
