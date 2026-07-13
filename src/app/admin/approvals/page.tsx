import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getCurrentUserWithTenant } from "@/lib/auth/service-role-helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { env } from "@/lib/env"
import { ApprovalManagementClient } from "./approval-management-client"

// Edge 런타임 방지 - service_role은 Node.js에서만 작동
export const runtime = 'nodejs'
// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  // 현재 사용자 확인 (service_role)
  const userResult = await getCurrentUserWithTenant({ includeTenant: false })

  if (!userResult.success || !userResult.data) {
    redirect('/auth/login')
  }

  const userId = userResult.data.id

  // 플랫폼 운영자 권한 체크 (PLATFORM_ADMIN_EMAILS 허용목록) — service_role 사용
  const admin = createServiceRoleClient()
  const { data: userData } = await admin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single()

  const allowlist = (env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const email = userData?.email?.trim().toLowerCase()
  const isPlatformAdmin = !!email && allowlist.length > 0 && allowlist.includes(email)

  if (!isPlatformAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">접근 권한 없음</h1>
          <p className="text-muted-foreground">
            이 페이지는 플랫폼 운영자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  // 승인 대기 중인 사용자 목록 가져오기 (service_role 사용 - RLS 우회)
  const { data: pendingUsers } = await admin
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

  // 최근 승인/거부된 사용자 목록 (service_role 사용 - RLS 우회)
  const { data: recentDecisions } = await admin
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
        currentUserId={userId}
      />
    </Suspense>
  )
}