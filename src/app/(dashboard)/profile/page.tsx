import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import {
  Mail,
  Phone,
  Shield,
  Building2,
  MapPin,
  Link2,
  Globe,
  UserCog,
  KeyRound,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '내 정보',
  description: '사용자 프로필 정보를 확인합니다.',
}

const ROLE_LABELS: Record<string, string> = {
  owner: '원장',
  instructor: '강사',
  assistant: '조교',
  parent: '학부모',
  student: '학생',
}

const PLAN_LABELS: Record<string, string> = {
  free: '무료 플랜',
  basic: '베이직 플랜',
  premium: '프리미엄 플랜',
  enterprise: '엔터프라이즈 플랜',
}

const APPROVAL_LABELS: Record<string, string> = {
  approved: '승인됨',
  pending: '승인 대기',
  rejected: '거부됨',
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('ko-KR')
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function valueOrDash(value?: string | null) {
  if (!value || !value.trim()) return '-'
  return value
}

export default async function ProfilePage() {
  // Verify authentication
  await requireAuth()

  // Get current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Fetch user details from database
  const { data: userDetails } = await supabase
    .from('users')
    .select(`
      id,
      tenant_id,
      email,
      name,
      phone,
      address,
      role_code,
      approval_status,
      approval_reason,
      approved_at,
      onboarding_completed,
      onboarding_completed_at,
      created_at,
      updated_at
    `)
    .eq('id', user.id)
    .single()

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, timezone, settings, created_at')
    .eq('id', userDetails?.tenant_id)
    .single()

  const tenantSettings = (tenant?.settings as Record<string, string | null> | null) || null
  const provider =
    (user.app_metadata?.provider as string | undefined) ||
    (Array.isArray(user.app_metadata?.providers) ? user.app_metadata?.providers[0] : undefined)

  const roleLabel = userDetails?.role_code ? ROLE_LABELS[userDetails.role_code] || userDetails.role_code : '사용자'
  const approvalLabel = userDetails?.approval_status
    ? APPROVAL_LABELS[userDetails.approval_status] || userDetails.approval_status
    : '미확인'
  const planLabel = (tenantSettings?.plan && PLAN_LABELS[tenantSettings.plan]) || tenantSettings?.plan

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">내 정보</h1>
          <p className="text-muted-foreground">프로필, 권한, 보안 상태를 한 번에 확인합니다.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-white">
                  {(userDetails?.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-semibold">{valueOrDash(userDetails?.name)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{roleLabel}</Badge>
                    <Badge variant={userDetails?.approval_status === 'approved' ? 'default' : 'secondary'}>
                      {approvalLabel}
                    </Badge>
                    <Badge variant={userDetails?.onboarding_completed ? 'default' : 'outline'}>
                      온보딩 {userDetails?.onboarding_completed ? '완료' : '미완료'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings">
                    <UserCog className="h-4 w-4" />
                    설정
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/settings/academy">
                    <Building2 className="h-4 w-4" />
                    학원 설정
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>연락처 정보</CardTitle>
              <CardDescription>프로필 기본 연락처 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Mail className="mt-1 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">이메일</p>
                  <p className="text-sm">{valueOrDash(userDetails?.email || user.email || null)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone className="mt-1 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">연락처</p>
                  <p className="text-sm">{valueOrDash(userDetails?.phone || user.phone || null)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">주소</p>
                  <p className="text-sm">{valueOrDash(userDetails?.address)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계정 정보</CardTitle>
              <CardDescription>권한, 승인, 계정 메타 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Shield className="mt-1 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">역할</p>
                  <Badge variant="secondary">{roleLabel}</Badge>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">승인 상태</p>
                <Badge variant={userDetails?.approval_status === 'approved' ? 'default' : 'secondary'}>
                  {approvalLabel}
                </Badge>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">승인 일시</p>
                <p className="text-sm">{formatDateTime(userDetails?.approved_at)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">승인 사유/메모</p>
                <p className="text-sm">{valueOrDash(userDetails?.approval_reason)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">온보딩 완료 일시</p>
                <p className="text-sm">{formatDateTime(userDetails?.onboarding_completed_at)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">사용자 ID</p>
                <p className="break-all text-sm">{valueOrDash(userDetails?.id || user.id)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>계정 보안</CardTitle>
              <CardDescription>로그인 및 인증 상태입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <KeyRound className="mt-1 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="mb-1 text-sm text-muted-foreground">로그인 방식</p>
                  <p className="text-sm">{valueOrDash(provider || 'email')}</p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">마지막 로그인</p>
                <p className="text-sm">{formatDateTime(user.last_sign_in_at)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">이메일 인증</p>
                <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                  {user.email_confirmed_at ? '인증됨' : '미인증'}
                </Badge>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">전화번호 인증</p>
                <Badge variant={user.phone_confirmed_at ? 'default' : 'secondary'}>
                  {user.phone_confirmed_at ? '인증됨' : '미인증'}
                </Badge>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Auth 계정 생성일</p>
                <p className="text-sm">{formatDateTime(user.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>소속 학원 정보</CardTitle>
              <CardDescription>현재 연결된 학원의 기본 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원명</p>
                <p className="font-medium">{valueOrDash(tenant?.name)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">플랜</p>
                <p className="text-sm">{valueOrDash(planLabel || null)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">시간대</p>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{valueOrDash(tenant?.timezone)}</span>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원 연락처</p>
                <p className="text-sm">{valueOrDash(tenantSettings?.phone || null)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원 이메일</p>
                <p className="text-sm">{valueOrDash(tenantSettings?.email || null)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원 주소</p>
                <p className="text-sm">{valueOrDash(tenantSettings?.address || null)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">웹사이트</p>
                {tenantSettings?.website ? (
                  <Link
                    href={tenantSettings.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Link2 className="h-4 w-4" />
                    <span>{tenantSettings.website}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원 코드(slug)</p>
                <p className="text-sm">{valueOrDash(tenant?.slug)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원 ID</p>
                <p className="break-all text-sm">{valueOrDash(tenant?.id)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">학원 생성일</p>
                <p className="text-sm">{formatDate(tenant?.created_at)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">내 계정 생성일</p>
                <p className="text-sm">{formatDate(userDetails?.created_at || user.created_at)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">내 계정 수정일</p>
                <p className="text-sm">{formatDateTime(userDetails?.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
