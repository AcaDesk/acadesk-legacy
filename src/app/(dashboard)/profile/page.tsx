import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Mail, Phone, Calendar, Shield, Building2 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '내 정보',
  description: '사용자 프로필 정보를 확인합니다.',
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
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, plan')
    .eq('id', userDetails?.tenant_id)
    .single()

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">내 정보</h1>
          <p className="text-muted-foreground">사용자 프로필 및 계정 정보</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>계정 기본 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center mb-6">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-3xl font-bold">
                  {userDetails?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">이름</p>
                  <p className="font-medium">{userDetails?.name || '-'}</p>
                </div>

                {userDetails?.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">이메일</p>
                      <p className="text-sm">{userDetails.email}</p>
                    </div>
                  </div>
                )}

                {userDetails?.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">연락처</p>
                      <p className="text-sm">{userDetails.phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">가입일</p>
                    <p className="text-sm">
                      {new Date(userDetails?.created_at || user.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 계정 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>계정 정보</CardTitle>
              <CardDescription>권한 및 소속 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">역할</p>
                  <Badge variant="secondary">
                    {userDetails?.role_code === 'owner' && '원장'}
                    {userDetails?.role_code === 'instructor' && '강사'}
                    {userDetails?.role_code === 'assistant' && '보조교사'}
                    {userDetails?.role_code === 'parent' && '학부모'}
                    {userDetails?.role_code === 'student' && '학생'}
                    {!userDetails?.role_code && '사용자'}
                  </Badge>
                </div>
              </div>

              {tenant && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">소속 학원</p>
                    <p className="font-medium">{tenant.name}</p>
                    {tenant.plan && (
                      <Badge variant="outline" className="mt-1">
                        {tenant.plan === 'free' && '무료 플랜'}
                        {tenant.plan === 'basic' && '베이직 플랜'}
                        {tenant.plan === 'premium' && '프리미엄 플랜'}
                        {tenant.plan === 'enterprise' && '엔터프라이즈 플랜'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">승인 상태</p>
                <Badge variant={userDetails?.approval_status === 'approved' ? 'default' : 'secondary'}>
                  {userDetails?.approval_status === 'approved' && '승인됨'}
                  {userDetails?.approval_status === 'pending' && '승인 대기'}
                  {userDetails?.approval_status === 'rejected' && '거부됨'}
                  {!userDetails?.approval_status && '미확인'}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">온보딩 완료</p>
                <Badge variant={userDetails?.onboarding_completed ? 'default' : 'secondary'}>
                  {userDetails?.onboarding_completed ? '완료' : '미완료'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 계정 보안 */}
        <Card>
          <CardHeader>
            <CardTitle>계정 보안</CardTitle>
            <CardDescription>로그인 및 보안 설정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">마지막 로그인</p>
                <p className="text-sm">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleString('ko-KR')
                    : '-'
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">이메일 인증</p>
                <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                  {user.email_confirmed_at ? '인증됨' : '미인증'}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">전화번호 인증</p>
                <Badge variant={user.phone_confirmed_at ? 'default' : 'secondary'}>
                  {user.phone_confirmed_at ? '인증됨' : '미인증'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
